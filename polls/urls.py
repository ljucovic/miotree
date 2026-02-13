from django.urls import path

from . import views

urlpatterns = [
    # ex: /polls/
    path('', views.index, name='index'),
    path('family/<int:family_id>/', views.family_detail, name='family_detail'),
]