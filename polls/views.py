from django.core import serializers
from django.http import HttpResponse
from django.shortcuts import render
from .models import *
import json


def index(request) -> HttpResponse:
    """function for index view, preparing data from db for the view"""
    results = []

    # this result needs to be prepared for the view
    db_families = Family.objects.all()  # pylint: disable=[E1101]
    ids = []

    for f in db_families:
        # saves the id or each family from the db
        ids.append(f.id)

    ser_families = serializers.serialize('json', db_families)
    families = json.loads(ser_families)

    for family in families:
        # adds all the fields for each serialized family to result
        results.append(family['fields'])

    results = prepare_parents_informations(results, ids)

    if isinstance(results, list) and all(isinstance(d, dict) for d in results):
        print("Alles richtig")
    else:
        # results ist keine Liste von Dictionaries
        print("Nicht alles richtig")

    # sort result first_seen for the view
    sorted_result = sorted(results, key=lambda x: x['first_seen'])
    prepared_result = []
    prepared_result.append(sorted_result)
    context = {'families': json.dumps(prepared_result)}

    return render(request, 'index.html', context)


def prepare_parents_informations(results, ids):
    """Prepare dataset
            1. add its id from db for each familie
            2. translate parents from a string of parents_ids
                separatet with a single code in an array of parents_ids"""
    i = 0
    for result in results:
        # appends ids for each family
        result['id'] = str(ids[i])
        i += 1
        parents = []
        # prepared parents value for view
        # form string separete with "," to an array
        if result['parents'] is not None:
            parents_raw = result.get('parents')
            if parents_raw is not None:
                parents = parents_raw.split(",")

                del result['parents']  # remove old value
                result['parents'] = parents  # add new value
        else:
            del result['parents']

    return results
