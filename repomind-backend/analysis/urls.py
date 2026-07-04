from django.urls import path
from . import views

urlpatterns = [
    path('', views.CreateAnalysisView.as_view(), name='create-analysis'),
    path('<uuid:analysis_id>/status/', views.AnalysisStatusView.as_view(), name='analysis-status'),
    path('<uuid:analysis_id>/ask/', views.AskRepoMindView.as_view(), name='analysis-ask'),
    path('<uuid:analysis_id>/', views.AnalysisDetailView.as_view(), name='analysis-detail'),
]