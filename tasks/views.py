from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Task, Category
import json
from datetime import datetime

def parse_due_date(date_str):
    if not date_str:
        return None
    try:
        dt=datetime.fromisoformat(date_str)
        return timezone.make_aware(dt)
    except ValueError:
        return None

def index(request):
    return render(request, 'tasks/index.html')

def task_list(request):
    return render(request, 'tasks/task_list.html')

def create_task(request):
    return render(request, 'tasks/create_task.html')

def create_task_view(request):
    return render(request, 'tasks/create_task.html')

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('index')
        else:
            return render(request, 'tasks/login.html', {
                'message': 'Invalid credentials.'
            })
    return render(request, 'tasks/login.html')

def logout_view(request):
    logout(request)
    return redirect('index')

def register(request):
    if request.method == 'POST':
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']
        confirmation = request.POST['confirmation']

        if password != confirmation:
            return render(request, 'tasks/register.html', {
                'message': 'Passwords must match.'
            })

        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except:
            return render(request, 'tasks/register.html', {
                'message': 'Username already taken.'
            })

        login(request, user)
        return redirect('index')
    return render(request, 'tasks/register.html')

@login_required
def profile(request):
    if request.method == 'POST':
        user=request.user
        user.email = request.POST['email']
        user.save()
        return redirect('profile')
    return render(request, 'tasks/profile.html')

@login_required
def tasks(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            task = Task(
                user=request.user,
                title=data.get('title', '').strip(),
                description=data.get('description', '').strip(),
                due_date=parse_due_date(data.get('due_date'))
            )

            if not task.title:
                return JsonResponse({'error': 'Title is required'}, status=400)

            task.save()

            category_ids = data.get('categories', [])
            if category_ids:
                categories = Category.objects.filter(
                    id__in=category_ids,
                    user=request.user
                )
                task.categories.set(categories)

            return JsonResponse(task.serialize(), status=201)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    if request.method == 'GET':
        tasks = Task.objects.filter(user=request.user).order_by('complete', 'due_date')
        return JsonResponse([task.serialize() for task in tasks], safe=False)

    elif request.method == 'POST':
        data = json.loads(request.body)
        task = Task(
            user=request.user,
            title=data.get('title'),
            description=data.get('description', ''),
            due_date=data.get('due_date')
        )
        task.save()

        for category_id in data.get('categories', []):
            try:
                category = Category.objects.get(id=category_id, user=request.user)
                task.categories.add(category)
            except Category.DoesNotExist:
                pass

        return JsonResponse(task.serialize(), status=201)

@login_required
def task(request, task_id):
    try:
        task = Task.objects.get(id=task_id, user=request.user)
    except Task.DoesNotExist:
        return JsonResponse({'error': 'Task not found.'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        if data.get('title'):
            task.title = data['title']
        if data.get('description'):
            task.description = data['description']
        if data.get('complete') is not None:
            task.complete = data['complete']
        if 'due_date' in data:
            task.due_date = parse_due_date(data['due_date'])
        task.save()
        if 'categories' in data:
            task.categories.clear()
            for category_id in data['categories']:
                try:
                    category = Category.objects.get(id=category_id, user=request.user)
                    task.categories.add(category)
                except Category.DoesNotExist:
                    pass
        return JsonResponse(task.serialize())
    elif request.method == 'DELETE':
        task.delete()
        return JsonResponse({'message': 'Task deleted successfully.'}, status=200)


@login_required
def categories(request):
    if request.method == 'GET':
        categories = Category.objects.filter(user=request.user)
        return JsonResponse([category.serialize() for category in categories], safe=False)

    elif request.method == 'POST':
        data = json.loads(request.body)

        name = data.get('name', '').strip()
        if not name:
            return JsonResponse({'error': 'Category name is required'}, status=400)

        if Category.objects.filter(user=request.user, name=name).exists():
            return JsonResponse({'error': 'Category already exists'}, status=400)

        category = Category(
            user = request.user,
            name=name
        )
        category.save()
        return JsonResponse(category.serialize(), status=201)
