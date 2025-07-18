from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('create/', views.create_task_view, name='create'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register, name='register'),
    path('profile/', views.profile, name='profile'),

    path('tasks/', views.tasks, name='tasks'),
    path('tasks/<int:task_id>', views.task, name='task'),
    path('categories/', views.categories, name='categories'),
]
