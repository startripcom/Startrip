import os
from celery import Celery

settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', 'startip_backend.settings')
try:
    import importlib
    importlib.import_module(settings_module)
except ModuleNotFoundError:
    settings_module = 'startip_backend.settings'
os.environ['DJANGO_SETTINGS_MODULE'] = settings_module


app = Celery('startip_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'StarTip Celery Task: {self.request!r}')
