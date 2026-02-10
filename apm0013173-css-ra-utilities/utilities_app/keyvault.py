import os
import logging
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

class KeyVaultHelper:
    def __init__(self, vault_url):
        self.vault_url = vault_url
        self.credential = DefaultAzureCredential()
        self.client = SecretClient(vault_url=self.vault_url, credential=self.credential)
        self.cache = {}

    def get_secret(self, secret_name):
        if secret_name in self.cache:
            return self.cache[secret_name]
        try:
            secret = self.client.get_secret(secret_name)
            self.cache[secret_name] = secret.value
            return secret.value
        except Exception as e:
            logging.error(f"KeyVault: Failed to fetch secret '{secret_name}': {e}")
            raise

def get_vault_url():
    vault_url = os.environ.get("AZURE_KEY_VAULT_URL")
    if not vault_url:
        vault_name = os.environ.get("AZURE_KEY_VAULT_NAME")
        if vault_name:
            vault_url = f"https://{vault_name}.vault.azure.net/"
    if not vault_url:
        raise RuntimeError("KeyVault: AZURE_KEY_VAULT_URL or AZURE_KEY_VAULT_NAME must be set")
    return vault_url
