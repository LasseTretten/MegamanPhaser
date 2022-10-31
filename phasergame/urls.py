from django.urls import path
from . import views


app_name = 'phasergame'
urlpatterns = [path('', views.phasergame, name='phasergame')]
