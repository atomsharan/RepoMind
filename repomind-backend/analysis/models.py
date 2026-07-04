import uuid
from django.db import models


class Analysis(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    repository_url = models.URLField(max_length=500)
    repository_owner = models.CharField(max_length=255, blank=True, default='')
    repository_name = models.CharField(max_length=255, blank=True, default='')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    current_stage = models.CharField(max_length=100, blank=True, default='')
    progress = models.IntegerField(default=0)
    status_message = models.CharField(max_length=255, blank=True, default='')

    repository_data = models.JSONField(null=True, blank=True)
    architecture_data = models.JSONField(null=True, blank=True)
    risk_data = models.JSONField(null=True, blank=True)
    memory_data = models.JSONField(null=True, blank=True)
    continuity_data = models.JSONField(null=True, blank=True)
    final_analysis = models.JSONField(null=True, blank=True)

    error_message = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.repository_name or self.repository_url} ({self.status})"