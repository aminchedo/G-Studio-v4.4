# SSL Context Patch
import ssl
import warnings

# غیرفعال کردن هشدارهای SSL
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

# پچ کردن SSL context
original_create_default_context = ssl.create_default_context

def patched_create_default_context(*args, **kwargs):
    context = original_create_default_context(*args, **kwargs)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context

ssl.create_default_context = patched_create_default_context

print("SSL verification disabled globally")
