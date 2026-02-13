from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404
from .models import Family
import json


def index(request) -> HttpResponse:
    """function for index view, preparing data from db for the view"""
    families = Family.objects.all().order_by('first_seen')
    results = []
    for f in families:
        parent_ids = [str(p.id) for p in f.parents.all()]
        result = {
            'id': str(f.id),
            'name': f.name,
            'alias': f.alias,
            'first_seen': f.first_seen,
            'last_seen': f.last_seen,
            'bot_size': f.bot_size,
            'open_source': f.open_source,
            'white_malware': f.white_malware,
            'informations': f.informations,
        }
        if parent_ids:
            result['parents'] = parent_ids
        results.append(result)

    context = {'families': json.dumps([results])}
    return render(request, 'index.html', context)


def family_detail(request, family_id) -> HttpResponse:
    """Detail view for a single malware family."""
    f = get_object_or_404(Family, pk=family_id)

    parents = [{'id': p.id, 'name': p.name} for p in f.parents.all()]

    informations = f.informations
    if isinstance(informations, str):
        try:
            informations = json.loads(informations)
        except (TypeError, ValueError):
            informations = {}

    events = f.events if f.events else []

    family_data = {
        'id': f.id,
        'name': f.name,
        'alias': f.alias,
        'first_seen': f.first_seen,
        'last_seen': f.last_seen,
        'parents': parents,
        'bot_size': f.bot_size,
        'open_source': f.open_source,
        'white_malware': f.white_malware,
        'informations': informations,
        'events': events,
    }

    context = {
        'family': f,
        'family_json': json.dumps(family_data),
    }
    return render(request, 'family_detail.html', context)
