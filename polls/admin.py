import datetime
from django.contrib import admin
from .models import *
from django import forms
from django.forms.widgets import Textarea
import json


# Register your models here.
class JsonEditor(Textarea):
    def __init__(self, *args, **kwargs):
        kwargs['attrs'] = {'class': 'json-editor'}
        super(JsonEditor, self).__init__(*args, **kwargs)

    def format_value(self, value):
        value = value.replace('\'', '\§')
        return json.loads(value)

class FamilyAdminForm(forms.ModelForm):
    # Own FamilyForm for Admins side because of informations as JSON
    class Meta:
        model = Family
        fields = '__all__'
        widgets = {
            'informations': JsonEditor(),
        }

    def valid_first_seen_field(self):
        data = self.cleaned_data['first_seen']
        try:
            # Überprüfen, ob das Datum im richtigen Format ist
            datetime.datetime.strptime(data, '%Y-%m')
        except ValueError:
            raise forms.ValidationError('Das Datum muss im Format YYYY-MM sein.')
        # Überprüfen, ob das Datum größer als 2007 ist
        if data < '2007-01':
            raise forms.ValidationError(
                'Das Datum muss größer als 2007-01 sein.')
        # Überprüfen, ob das Datum kleiner als das aktuelle Jahr ist
        current_year = datetime.datetime.now().strftime('%Y')
        if data > current_year:
            raise forms.ValidationError(
                'Das Datum darf nicht größer als das aktuelle Jahr sein.')
        return data

    def valid_last_seen_field(self):
        data = self.cleaned_data['last_seen']
        try:
            # Überprüfen, ob das Datum im richtigen Format ist
            datetime.datetime.strptime(data, '%Y-%m')
        except ValueError:
            raise forms.ValidationError('Das Datum muss im Format YYYY-MM sein.')
        # Überprüfen, ob das Datum größer als 2007 ist
        if data < '2007-01':
            raise forms.ValidationError(
                'Das Datum muss größer als 2007-01 sein.')
        # Überprüfen, ob das Datum kleiner als das aktuelle Jahr ist
        current_year = datetime.datetime.now().strftime('%Y')
        if data > current_year:
            raise forms.ValidationError(
                'Das Datum darf nicht größer als das aktuelle Jahr sein.')
        return data


class FamilyAdmin(admin.ModelAdmin):
    # represent the admin same, which informations are shown and in which order
    form = FamilyAdminForm
    list_display = ('id', 'name', "parents", "open_source", "first_seen",
                    "last_seen", "white_malware", "bot_size", 'alias', )


    def first_seen(self):
        d = self.first_seen
        d = datetime.datetime.fromtimestamp(d).strftime('%Y-%m-%d')
        return d

    def last_seen(self):
        d = self.last_seen
        d = datetime.datetime.fromtimestamp(d).strftime('%Y-%m-%d')
        return d

admin.site.register(Family, FamilyAdmin)  # register own classes in django
