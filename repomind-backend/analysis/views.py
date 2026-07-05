import re
from datetime import datetime, timezone

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Analysis
from .repository_analyzer import (
    RepositoryAnalysisError,
    answer_question,
    build_repository_analysis,
)
from .serializers import (
    AnalysisCreateResponseSerializer,
    AnalysisCreateSerializer,
    AnalysisStatusSerializer,
    AskQuestionSerializer,
)


GITHUB_URL_PATTERN = re.compile(
    r'^https?://github\.com/(?P<owner>[\w.-]+)/(?P<repo>[\w.-]+?)(?:\.git)?/?$'
)

PROCESSING_DURATION_SECONDS = 8

ANALYSIS_STAGES = [
    (0, 'repository_discovery', 10, 'Fetching repository metadata'),
    (2, 'repository_tree', 30, 'Reading repository tree'),
    (4, 'architecture_analysis', 55, 'Mapping project components'),
    (6, 'risk_analysis', 75, 'Identifying technical risks'),
    (7, 'project_memory', 90, 'Reconstructing project history'),
]


def parse_github_url(url: str):
    match = GITHUB_URL_PATTERN.match(url.strip())
    if not match:
        return None
    return match.group('owner'), match.group('repo')


def _get_custom_error_response(message: str, status_code: int):
    return Response({'error': message}, status=status_code)


def sync_analysis_progress(analysis: Analysis) -> Analysis:
    if analysis.status in ('completed', 'failed'):
        return analysis

    elapsed = (datetime.now(timezone.utc) - analysis.created_at).total_seconds()

    if elapsed >= PROCESSING_DURATION_SECONDS:
        analysis.current_stage = 'finalizing'
        analysis.progress = 95
        analysis.status_message = 'Finalizing repository intelligence'
        analysis.save()

        try:
            analysis.final_analysis = build_repository_analysis(analysis)
            analysis.repository_data = analysis.final_analysis.get('repository')
            analysis.architecture_data = analysis.final_analysis.get('architecture')
            analysis.risk_data = analysis.final_analysis.get('risks')
            analysis.memory_data = analysis.final_analysis.get('project_memory')
            analysis.continuity_data = analysis.final_analysis.get('continuity_plan')
            analysis.status = 'completed'
            analysis.current_stage = 'completed'
            analysis.progress = 100
            analysis.status_message = 'Analysis complete'
            analysis.error_message = ''
        except RepositoryAnalysisError as exc:
            analysis.status = 'failed'
            analysis.current_stage = 'failed'
            analysis.progress = 100
            analysis.status_message = 'Analysis failed'
            analysis.error_message = str(exc)

        analysis.save()
        return analysis

    stage, progress, message = ANALYSIS_STAGES[0][1], ANALYSIS_STAGES[0][2], ANALYSIS_STAGES[0][3]
    for threshold, stage_name, stage_progress, stage_message in ANALYSIS_STAGES:
        if elapsed >= threshold:
            stage, progress, message = stage_name, stage_progress, stage_message

    analysis.status = 'processing'
    analysis.current_stage = stage
    analysis.progress = progress
    analysis.status_message = message
    analysis.save()
    return analysis


class CreateAnalysisView(APIView):
    def post(self, request):
        repository_url = request.data.get('repository_url')
        if not isinstance(repository_url, str) or not repository_url.strip():
            return _get_custom_error_response(
                'repository_url must be a valid public GitHub repository URL, e.g. https://github.com/owner/repository',
                status.HTTP_400_BAD_REQUEST,
            )

        parsed = parse_github_url(repository_url)
        if parsed is None:
            return _get_custom_error_response(
                'repository_url must be a valid public GitHub repository URL, e.g. https://github.com/owner/repository',
                status.HTTP_400_BAD_REQUEST,
            )

        serializer = AnalysisCreateSerializer(data={'repository_url': repository_url})
        serializer.is_valid(raise_exception=True)

        owner, repo = parsed
        analysis = Analysis.objects.create(
            repository_url=repository_url,
            repository_owner=owner,
            repository_name=repo,
            status='processing',
            current_stage='repository_discovery',
            progress=10,
            status_message='Initializing repository analysis',
        )

        return Response(
            AnalysisCreateResponseSerializer(analysis).data,
            status=status.HTTP_201_CREATED,
        )


class AnalysisStatusView(APIView):
    def get(self, request, analysis_id):
        analysis = get_object_or_404(Analysis, id=analysis_id)
        analysis = sync_analysis_progress(analysis)
        return Response(AnalysisStatusSerializer(analysis).data)


class AnalysisDetailView(APIView):
    def get(self, request, analysis_id):
        analysis = get_object_or_404(Analysis, id=analysis_id)
        analysis = sync_analysis_progress(analysis)

        if analysis.status == 'failed':
            return Response(
                {
                    'status': analysis.status,
                    'error': analysis.error_message or 'Analysis failed.',
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if analysis.status != 'completed':
            return Response(
                {
                    'status': analysis.status,
                    'detail': 'Analysis is not yet complete. Poll the status endpoint until status is "completed".',
                },
                status=status.HTTP_202_ACCEPTED,
            )

        return Response(analysis.final_analysis, status=status.HTTP_200_OK)


class AskRepoMindView(APIView):
    def post(self, request, analysis_id):
        analysis = get_object_or_404(Analysis, id=analysis_id)
        analysis = sync_analysis_progress(analysis)

        if analysis.status != 'completed':
            return Response(
                {'error': 'Analysis must be completed before asking questions.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = AskQuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answer = answer_question(serializer.validated_data['question'], analysis.final_analysis or {})
        return Response(answer, status=status.HTTP_200_OK)
