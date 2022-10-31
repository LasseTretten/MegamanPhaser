from django.shortcuts import render

def phasergame(request):
    return render(request, 'phasergame/phasergame.html', context=None)
