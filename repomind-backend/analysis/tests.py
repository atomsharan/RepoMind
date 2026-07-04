import time
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient


class AnalysisApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_analysis_returns_expected_payload(self):
        response = self.client.post(
            '/api/analysis/',
            {'repository_url': 'https://github.com/django/django'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertIn('analysis_id', payload)
        self.assertEqual(payload['repository_name'], 'django')
        self.assertEqual(payload['status'], 'processing')

    def test_invalid_repository_url_returns_error_message(self):
        response = self.client.post(
            '/api/analysis/',
            {'repository_url': 'not-a-url'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn('error', payload)
        self.assertIn('valid public GitHub repository URL', payload['error'])

    def test_status_progresses_and_detail_ask_follow_contract(self):
        with patch('analysis.views.MOCK_PROCESSING_DURATION_SECONDS', 0.35), patch(
            'analysis.views.MOCK_STAGES',
            [
                (0, 'repository_discovery', 10, 'Fetching repository metadata'),
                (0.1, 'architecture_analysis', 40, 'Mapping project components'),
                (0.2, 'risk_analysis', 60, 'Identifying technical risks'),
                (0.3, 'project_memory', 80, 'Reconstructing project history'),
            ],
        ):
            create_response = self.client.post(
                '/api/analysis/',
                {'repository_url': 'https://github.com/django/django'},
                format='json',
            )
            analysis_id = create_response.json()['analysis_id']

            status_response = self.client.get(f'/api/analysis/{analysis_id}/status/')
            self.assertEqual(status_response.status_code, 200)
            self.assertEqual(status_response.json()['current_stage'], 'repository_discovery')
            self.assertEqual(status_response.json()['progress'], 10)

            time.sleep(0.12)
            status_response = self.client.get(f'/api/analysis/{analysis_id}/status/')
            self.assertEqual(status_response.json()['current_stage'], 'architecture_analysis')
            self.assertEqual(status_response.json()['progress'], 40)

            time.sleep(0.25)
            detail_response = self.client.get(f'/api/analysis/{analysis_id}/')
            self.assertEqual(detail_response.status_code, 200)
            self.assertIn('analysis_id', detail_response.json())

            ask_response = self.client.post(
                f'/api/analysis/{analysis_id}/ask/',
                {'question': 'Where should a new developer start?'},
                format='json',
            )
            self.assertEqual(ask_response.status_code, 200)
            self.assertIn('answer', ask_response.json())
            self.assertIn('confidence', ask_response.json())
