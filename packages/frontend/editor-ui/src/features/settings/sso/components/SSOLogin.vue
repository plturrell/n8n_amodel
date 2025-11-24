<script lang="ts" setup>
import { computed } from 'vue';
import { useSSOStore } from '../sso.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useRoute } from 'vue-router';
import { useSettingsStore } from '@/app/stores/settings.store';

import { N8nButton } from '@n8n/design-system';
const i18n = useI18n();
const ssoStore = useSSOStore();
const settingsStore = useSettingsStore();
const toast = useToast();
const route = useRoute();

// Check if Postgres auth is enabled (via settings)
const isPostgresAuthEnabled = computed(() => {
	return ssoStore.isPostgresAuthEnabled;
});

// Check if XSUAA is enabled (via OIDC config or XSUAA-specific config)
const isXSUAAEnabled = computed(() => {
	return ssoStore.isXSUAAEnabled || (ssoStore.isOidcLoginEnabled && ssoStore.oidc.loginUrl?.includes('xsuaa'));
});

const onSSOLogin = async () => {
	try {
		const redirectUrl = ssoStore.isDefaultAuthenticationSaml
			? await ssoStore.getSSORedirectUrl(
					typeof route.query?.redirect === 'string' ? route.query.redirect : '',
				)
			: ssoStore.oidc.loginUrl;
		window.location.href = redirectUrl ?? '';
	} catch (error) {
		toast.showError(error, 'Error', error.message);
	}
};

const onPostgresLogin = () => {
	// Postgres auth uses standard email/password form
	// This button is informational - actual auth happens via form
	toast.showMessage({
		title: 'Postgres Authentication',
		message: 'Please use the email and password form above to sign in with your Postgres account.',
		type: 'info',
	});
};

const onXSUAALogin = async () => {
	try {
		if (ssoStore.oidc.loginUrl) {
			window.location.href = ssoStore.oidc.loginUrl;
		} else {
			toast.showError(new Error('XSUAA login URL not configured'), 'Error');
		}
	} catch (error) {
		toast.showError(error, 'Error', error.message);
	}
};
</script>

<template>
	<div v-if="ssoStore.showSsoLoginButton || isPostgresAuthEnabled || isXSUAAEnabled" :class="$style.ssoLogin">
		<div :class="$style.divider">
			<span>{{ i18n.baseText('sso.login.divider') }}</span>
		</div>
		
		<!-- Standard SSO Login (SAML/OIDC) -->
		<N8nButton
			v-if="ssoStore.showSsoLoginButton"
			size="large"
			type="primary"
			outline
			:label="i18n.baseText('sso.login.button')"
			@click="onSSOLogin"
		/>
		
		<!-- Postgres Auth Button -->
		<button
			v-if="isPostgresAuthEnabled"
			class="sc-sso-button sc-sso-button-postgres"
			@click="onPostgresLogin"
		>
			<span>Sign in with Postgres</span>
		</button>
		
		<!-- XSUAA Auth Button -->
		<button
			v-if="isXSUAAEnabled"
			class="sc-sso-button sc-sso-button-xsuaa"
			@click="onXSUAALogin"
		>
			<span>Sign in with XSUAA</span>
		</button>
	</div>
</template>

<style lang="scss" module>
.ssoLogin {
	text-align: center;
}

.divider {
	position: relative;
	text-transform: uppercase;

	&::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: 1px;
		background-color: var(--color--foreground);
	}

	span {
		position: relative;
		display: inline-block;
		margin: var(--spacing--2xs) auto;
		padding: var(--spacing--lg);
		background: var(--color--background--light-3);
	}
}
</style>
