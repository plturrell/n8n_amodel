import type { User } from '@n8n/db';
import { UserRepository, RoleRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Pool } from 'pg';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';

import { AuthError } from '@/errors/response-errors/auth.error';
import { PasswordUtility } from '@/services/password.utility';

interface PostgresUser {
	id: string;
	email: string;
	password_hash: string;
	first_name?: string;
	last_name?: string;
	roles?: string[];
	metadata?: Record<string, any>;
	created_at: Date;
	updated_at: Date;
}

/**
 * Handle user login via Postgres database
 * Queries external Postgres database for user authentication
 */
export const handlePostgresLogin = async (
	email: string,
	password: string,
): Promise<User | undefined> => {
	const logger = Container.get(Logger);
	const globalConfig = Container.get(GlobalConfig);
	
	// Access Postgres auth config
	const postgresAuthEnabled = globalConfig.getEnv('userManagement.postgresAuth.enabled');
	const postgresAuthDsn = globalConfig.getEnv('userManagement.postgresAuth.dsn');
	const postgresAuthTable = globalConfig.getEnv('userManagement.postgresAuth.table') || 'users';
	const postgresAuthEmailColumn = globalConfig.getEnv('userManagement.postgresAuth.emailColumn') || 'email';
	const postgresAuthPasswordColumn = globalConfig.getEnv('userManagement.postgresAuth.passwordColumn') || 'password_hash';
	const postgresAuthRoleMappingStr = globalConfig.getEnv('userManagement.postgresAuth.roleMapping') || '{}';

	if (!postgresAuthEnabled) {
		return undefined;
	}

	if (!postgresAuthDsn) {
		logger.warn('Postgres auth enabled but DSN not configured');
		return undefined;
	}

	// Parse role mapping JSON
	let postgresAuthRoleMapping: Record<string, string> = {};
	try {
		postgresAuthRoleMapping = JSON.parse(postgresAuthRoleMappingStr);
	} catch (e) {
		logger.warn('Invalid Postgres auth role mapping JSON', { error: e });
	}

	// Create Postgres connection pool
	const pool = new Pool({
		connectionString: postgresConfig.dsn,
		max: 5,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000,
	});

	try {
		// Query user from Postgres
		const query = `
			SELECT 
				id,
				${postgresAuthEmailColumn} as email,
				${postgresAuthPasswordColumn} as password_hash,
				COALESCE(first_name, '') as first_name,
				COALESCE(last_name, '') as last_name,
				COALESCE(roles::text[], ARRAY[]::text[]) as roles,
				COALESCE(metadata, '{}'::jsonb) as metadata,
				created_at,
				updated_at
			FROM ${postgresAuthTable}
			WHERE LOWER(${postgresAuthEmailColumn}) = LOWER($1)
			LIMIT 1
		`;

		const result = await pool.query<PostgresUser>(query, [email]);

		if (result.rows.length === 0) {
			await pool.end();
			return undefined;
		}

		const pgUser = result.rows[0];

		// Verify password
		const passwordUtility = Container.get(PasswordUtility);
		const isValidPassword = await passwordUtility.compare(password, pgUser.password_hash);

		if (!isValidPassword) {
			await pool.end();
			return undefined;
		}

		// Find or create n8n user
		const userRepository = Container.get(UserRepository);
		const roleRepository = Container.get(RoleRepository);

		let n8nUser = await userRepository.findOne({
			where: { email: pgUser.email.toLowerCase() },
			relations: ['authIdentities', 'role'],
		});

		if (!n8nUser) {
			// Create new n8n user from Postgres user (JIT provisioning)
			const defaultRole = await roleRepository.findOne({
				where: { slug: 'member' },
			});

			if (!defaultRole) {
				await pool.end();
				throw new AuthError('Default role not found');
			}

			n8nUser = userRepository.create({
				email: pgUser.email.toLowerCase(),
				firstName: pgUser.first_name || '',
				lastName: pgUser.last_name || '',
				role: defaultRole,
				password: null, // No local password, auth via Postgres
			});

			n8nUser = await userRepository.save(n8nUser);
		} else {
			// Update existing user with Postgres data
			n8nUser.firstName = pgUser.first_name || n8nUser.firstName || '';
			n8nUser.lastName = pgUser.last_name || n8nUser.lastName || '';
			n8nUser = await userRepository.save(n8nUser);
		}

		// Map roles if configured
		if (pgUser.roles && pgUser.roles.length > 0 && Object.keys(postgresAuthRoleMapping).length > 0) {
			const mappedRoleSlug = mapPostgresRoleToN8nRole(pgUser.roles, postgresAuthRoleMapping);
			if (mappedRoleSlug) {
				const mappedRole = await roleRepository.findOne({
					where: { slug: mappedRoleSlug },
				});
				if (mappedRole) {
					n8nUser.role = mappedRole;
					n8nUser = await userRepository.save(n8nUser);
				}
			}
		}

		await pool.end();
		return n8nUser;
	} catch (error) {
		await pool.end();
		logger.error('Postgres auth error', { error, email });
		throw new AuthError('Authentication failed');
	}
};

/**
 * Map Postgres roles to n8n roles
 */
function mapPostgresRoleToN8nRole(
	pgRoles: string[],
	roleMapping: Record<string, string>,
): string | null {
	for (const pgRole of pgRoles) {
		if (roleMapping[pgRole]) {
			return roleMapping[pgRole];
		}
	}
	return null;
}

