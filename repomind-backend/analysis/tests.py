import time
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from analysis.repository_analyzer import RepositoryAnalysisError


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
        with patch('analysis.views.PROCESSING_DURATION_SECONDS', 0.35), patch(
            'analysis.views.ANALYSIS_STAGES',
            [
                (0, 'repository_discovery', 10, 'Fetching repository metadata'),
                (0.1, 'architecture_analysis', 40, 'Mapping project components'),
                (0.2, 'risk_analysis', 60, 'Identifying technical risks'),
                (0.3, 'project_memory', 80, 'Reconstructing project history'),
            ],
        ), patch('analysis.views.build_repository_analysis', return_value=_sample_final_analysis()):
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

    def test_failed_analysis_status_includes_error_message(self):
        with patch('analysis.views.PROCESSING_DURATION_SECONDS', 0), patch(
            'analysis.views.build_repository_analysis',
            side_effect=RepositoryAnalysisError('Repository tree is too large for the GitHub API response.'),
        ):
            create_response = self.client.post(
                '/api/analysis/',
                {'repository_url': 'https://github.com/django/django'},
                format='json',
            )
            analysis_id = create_response.json()['analysis_id']

            status_response = self.client.get(f'/api/analysis/{analysis_id}/status/')
            payload = status_response.json()

            self.assertEqual(payload['status'], 'failed')
            self.assertIn('too large', payload['error'])


def _sample_final_analysis():
    return {
        'analysis_id': 'test-analysis',
        'repository': {
            'name': 'django',
            'owner': 'django',
            'url': 'https://github.com/django/django',
        },
        'overview': {
            'summary': 'Dynamic test analysis.',
            'health_score': 82,
            'architecture_pattern': 'Django Application',
            'primary_stack': ['Python', 'Django'],
            'critical_risks': 0,
            'memory_events': 1,
            'files_analyzed': 4,
            'technologies_detected': 2,
            'components_identified': 1,
            'risks_found': 1,
            'top_priorities': [{'priority': 1, 'action': 'Add tests', 'reason': 'Coverage is limited.'}],
        },
        'architecture': {
            'pattern': 'Django Application',
            'summary': 'A Django project.',
            'entry_points': ['manage.py'],
            'technologies': ['Python', 'Django'],
            'components': [
                {
                    'id': 'component-1',
                    'name': 'Config',
                    'purpose': 'Configuration',
                    'technology': ['Python'],
                    'responsibilities': ['Route requests'],
                    'dependencies': [],
                    'related_files': ['manage.py'],
                    'evidence': [{'file': 'manage.py', 'description': 'Entry point.'}],
                }
            ],
        },
        'risks': [
            {
                'id': 'risk-low-tests',
                'title': 'Limited Test Coverage Signals',
                'severity': 'MEDIUM',
                'description': 'Few tests were detected.',
                'affected_files': ['manage.py'],
                'evidence': [{'file': 'manage.py', 'description': 'Entry point.'}],
                'potential_impact': 'Regressions may be missed.',
                'recommended_action': 'Add tests.',
                'confidence': 0.7,
            }
        ],
        'project_memory': [
            {
                'id': 'memory-1',
                'title': 'Initial commit',
                'date': '2026-07-04',
                'summary': 'Recent commit.',
                'why_it_matters': 'Shows project memory.',
                'evidence': [{'type': 'commit', 'reference': 'abc1234', 'description': 'Initial commit'}],
            }
        ],
        'continuity_plan': {
            'first_24_hours': [
                {
                    'action': 'Add tests.',
                    'reason': 'Few tests were detected.',
                    'priority': 'MEDIUM',
                    'related_files': ['manage.py'],
                    'expected_impact': 'Regressions may be missed.',
                }
            ],
            'first_week': [],
            'next_priorities': [],
        },
    }
