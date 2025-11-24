import type { User, Role } from '@n8n/db';
import { UserRepository, RoleRepository, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';

/**
 * User Mapping Service
 * Maps external authentication users (Postgres, XSUAA) to n8n User entities
 * Handles Just-In-Time (JIT) user provisioning and attribute synchronization
 */
@Service()
export class UserMappingService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly roleRepository: RoleRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	/**
	 * Map external auth user to n8n user
	 * Creates user if doesn't exist (JIT provisioning), updates if exists
	 */
	async mapExternalUserToN8nUser(params: {
		email: string;
		firstName?: string;
		lastName?: string;
		externalUserId?: string;
		externalRoles?: string[];
		authProvider: 'postgres' | 'xsuaa' | 'oidc';
	}): Promise<User> {
		const { email, firstName, lastName, externalUserId, externalRoles, authProvider } = params;

		// Find existing user
		let n8nUser = await this.userRepository.findOne({
			where: { email: email.toLowerCase() },
			relations: ['authIdentities', 'role'],
		});

		if (!n8nUser) {
			// JIT Provisioning: Create new user
			const defaultRole = await this.roleRepository.findOne({
				where: { slug: GLOBAL_MEMBER_ROLE.slug },
			});

			if (!defaultRole) {
				throw new Error('Default role not found');
			}

			n8nUser = this.userRepository.create({
				email: email.toLowerCase(),
				firstName: firstName || '',
				lastName: lastName || '',
				role: defaultRole,
				password: null, // No local password for external auth
			});

			n8nUser = await this.userRepository.save(n8nUser);
			this.logger.info('Created new user via JIT provisioning', {
				userId: n8nUser.id,
				email,
				authProvider,
			});
		} else {
			// Update existing user attributes
			if (firstName) n8nUser.firstName = firstName;
			if (lastName) n8nUser.lastName = lastName;
			n8nUser = await this.userRepository.save(n8nUser);
		}

		// Map roles from external auth
		if (externalRoles && externalRoles.length > 0) {
			const mappedRole = await this.mapExternalRolesToN8nRole(
				externalRoles,
				authProvider,
			);
			if (mappedRole) {
				n8nUser.role = mappedRole;
				n8nUser = await this.userRepository.save(n8nUser);
			}
		}

		return n8nUser;
	}

	/**
	 * Map external roles to n8n role
	 */
	async mapExternalRolesToN8nRole(
		externalRoles: string[],
		authProvider: 'postgres' | 'xsuaa' | 'oidc',
	): Promise<Role | null> {
		let roleMapping: Record<string, string> = {};

		try {
			if (authProvider === 'postgres') {
				const mappingStr =
					this.globalConfig.getEnv('userManagement.postgresAuth.roleMapping') || '{}';
				roleMapping = JSON.parse(mappingStr);
			} else if (authProvider === 'xsuaa') {
				const mappingStr =
					this.globalConfig.getEnv('sso.xsuaa.scopeRoleMapping') || '{}';
				roleMapping = JSON.parse(mappingStr);
			}
			// OIDC uses existing provisioning service
		} catch (e) {
			this.logger.warn('Failed to parse role mapping', { error: e, authProvider });
			return null;
		}

		// Find first matching role
		for (const externalRole of externalRoles) {
			if (roleMapping[externalRole]) {
				const n8nRoleSlug = roleMapping[externalRole];
				const role = await this.roleRepository.findOne({
					where: { slug: n8nRoleSlug },
				});
				if (role) {
					return role;
				}
			}
		}

		return null;
	}

	/**
	 * Sync user attributes from external auth
	 */
	async syncUserAttributes(
		user: User,
		attributes: {
			firstName?: string;
			lastName?: string;
			email?: string;
			roles?: string[];
		},
	): Promise<User> {
		if (attributes.firstName) user.firstName = attributes.firstName;
		if (attributes.lastName) user.lastName = attributes.lastName;
		if (attributes.email && attributes.email !== user.email) {
			// Email change - create new user or update?
			// For now, just log warning
			this.logger.warn('Email change detected but not updating', {
				userId: user.id,
				oldEmail: user.email,
				newEmail: attributes.email,
			});
		}

		return await this.userRepository.save(user);
	}
}

