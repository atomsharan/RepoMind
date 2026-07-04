from rest_framework import serializers
from .models import Analysis


class AnalysisCreateSerializer(serializers.Serializer):
    repository_url = serializers.URLField()


class AnalysisCreateResponseSerializer(serializers.ModelSerializer):
    analysis_id = serializers.UUIDField(source='id')

    class Meta:
        model = Analysis
        fields = ['analysis_id', 'repository_name', 'status']


class AnalysisStatusSerializer(serializers.ModelSerializer):
    message = serializers.CharField(source='status_message')

    class Meta:
        model = Analysis
        fields = ['status', 'current_stage', 'progress', 'message']


class AskQuestionSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=2000)