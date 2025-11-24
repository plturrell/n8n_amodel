import { Config, Env, Nested } from '../decorators';

@Config
class SamlConfig {
	/** Whether to enable SAML SSO. */
	@Env('N8N_SSO_SAML_LOGIN_ENABLED')
	loginEnabled: boolean = false;

	@Env('N8N_SSO_SAML_LOGIN_LABEL')
	loginLabel: string = '';
}

@Config
class OidcConfig {
	/** Whether to enable OIDC SSO. */
	@Env('N8N_SSO_OIDC_LOGIN_ENABLED')
	loginEnabled: boolean = false;
}

@Config
class XSUAAConfig {
	/** Whether to enable XSUAA (SAP BTP) authentication */
	@Env('N8N_XSUAA_ENABLED')
	enabled: boolean = false;

	/** XSUAA Client ID */
	@Env('N8N_XSUAA_CLIENT_ID')
	clientId: string = '';

	/** XSUAA Client Secret */
	@Env('N8N_XSUAA_CLIENT_SECRET')
	clientSecret: string = '';

	/** XSUAA URL (e.g., https://your-tenant.authentication.eu10.hana.ondemand.com) */
	@Env('N8N_XSUAA_URL')
	url: string = '';

	/** XSUAA Redirect URI */
	@Env('N8N_XSUAA_REDIRECT_URI')
	redirectUri: string = '';

	/** XSUAA Scope mapping to n8n roles (JSON string: {"xsuaa_scope": "n8n_role"}) */
	@Env('N8N_XSUAA_SCOPE_ROLE_MAPPING')
	scopeRoleMapping: string = '{}';
}

@Config
class LdapConfig {
	/** Whether to enable LDAP SSO. */
	@Env('N8N_SSO_LDAP_LOGIN_ENABLED')
	loginEnabled: boolean = false;

	@Env('N8N_SSO_LDAP_LOGIN_LABEL')
	loginLabel: string = '';
}

@Config
class ProvisioningConfig {
	/** Whether to provision the instance role from an SSO auth claim */
	@Env('N8N_SSO_SCOPES_PROVISION_INSTANCE_ROLE')
	scopesProvisionInstanceRole: boolean = false;

	/** Whether to provision the project <> role mappings from an SSO auth claim */
	@Env('N8N_SSO_SCOPES_PROVISION_PROJECT_ROLES')
	scopesProvisionProjectRoles: boolean = false;

	/** The name of scope to request on oauth flows */
	@Env('N8N_SSO_SCOPES_NAME')
	scopesName: string = 'n8n';

	/** The name of the expected claim to be returned for provisioning instance role */
	@Env('N8N_SSO_SCOPES_INSTANCE_ROLE_CLAIM_NAME')
	scopesInstanceRoleClaimName: string = 'n8n_instance_role';

	/** The name of the expected claim to be returned for provisioning project <> role mappings */
	@Env('N8N_SSO_SCOPES_PROJECTS_ROLES_CLAIM_NAME')
	scopesProjectsRolesClaimName: string = 'n8n_projects';
}

@Config
export class SsoConfig {
	/** Whether to create users when they log in via SSO. */
	@Env('N8N_SSO_JUST_IN_TIME_PROVISIONING')
	justInTimeProvisioning: boolean = true;

	/** Whether to redirect users from the login dialog to initialize SSO flow. */
	@Env('N8N_SSO_REDIRECT_LOGIN_TO_SSO')
	redirectLoginToSso: boolean = true;

	@Nested
	saml: SamlConfig;

	@Nested
	oidc: OidcConfig;

	@Nested
	ldap: LdapConfig;

	@Nested
	provisioning: ProvisioningConfig;

	@Nested
	xsuaa: XSUAAConfig;
}
