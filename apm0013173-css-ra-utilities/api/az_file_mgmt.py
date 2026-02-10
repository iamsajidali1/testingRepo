from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions, ContentSettings, BlobClient
from datetime import datetime, timedelta
from django.http import StreamingHttpResponse
import os, logging
from urllib.parse import quote
from azure.core.exceptions import HttpResponseError

STORAGE_NAME = os.getenv("STORAGE_NAME")
SERVICE_BASE_URI = os.getenv("SERVICE_BASE_URI")
CONTAINER_NAME = os.getenv("CONTAINER_NAME")

def get_blob_service_client():
    AZURE_STORAGE_URL = f"{STORAGE_NAME}.blob.core.windows.net"
    credentials = DefaultAzureCredential()
    return BlobServiceClient(account_url=AZURE_STORAGE_URL, credential=credentials)

def get_container_client(blob_service_client):
    return blob_service_client.get_container_client(container=CONTAINER_NAME)

def generate_sas_token(blob_name, hoursRequired=24):
    try:
        sas_token = generate_blob_sas(
            account_name=STORAGE_NAME,
            account_key=None,
            container_name=CONTAINER_NAME,
            blob_name=blob_name,
            user_delegation_key=get_blob_service_client().get_user_delegation_key(datetime.utcnow(), datetime.utcnow() + timedelta(hours=hoursRequired)),
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=hoursRequired)
        )
        return sas_token
    except Exception as e:
        print(f"Error generating SAS token: {e}")
        return None
    
def upload_blob(file):
    try:
        blob_service_client = get_blob_service_client()
        container_client = get_container_client(blob_service_client)

        if not container_client.exists():
            blob_service_client.create_container(CONTAINER_NAME)

        blob_client = container_client.get_blob_client(blob=file.name)
        blob_client.upload_blob(file, content_settings=ContentSettings(content_type=file.content_type), overwrite=True)
        sas_token = generate_sas_token(file.name)
        safe_sas = quote(sas_token, safe='')
        if sas_token:
            blob_internal_url = f"{SERVICE_BASE_URI}/files/download/?filename={file.name}&sas_token={safe_sas}"
            return blob_internal_url
        
    except Exception as e:
        logging.error(f"An unexpected error occurred while uploading the blob: {str(e)}")
        raise RuntimeError(f"An unexpected error occurred while uploading the blob: {e}")

def download_blob(filename, sas_token):
    try:
        blob_url = f"https://{STORAGE_NAME}.blob.core.windows.net/{CONTAINER_NAME}/{filename}?{sas_token}"
        blob_client = BlobClient.from_blob_url(blob_url)
        download_stream = blob_client.download_blob()
        response = StreamingHttpResponse(
            download_stream.chunks(),
            content_type="application/octet-stream"
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except HttpResponseError as e:
        logging.error(f"HTTP error occurred while downloading blob '{filename}': {str(e)}")
        raise RuntimeError(f"HTTP error occurred while downloading blob '{filename}': {e}")

    except Exception as e:
        logging.error(f"Unexpected error occurred while downloading blob '{filename}': {str(e)}")
        raise RuntimeError(f"Error streaming blob: {e}")