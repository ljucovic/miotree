
import re
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import json

class DoubleQuotesDecoder(json.JSONDecoder):

    def decode(self, s, **kwargs):
        # Replace simple quotes in double qoutes
        s = s.replace("'", '"')
        return super().decode(s, **kwargs)

class JSONField(models.TextField):
    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        try:
            print(value)
            return json.loads(value)
        except (TypeError, ValueError):
            return value

    def to_python(self, value):
        if isinstance(value, str):
            print(value)
            return json.loads(value)
        return value

    def get_prep_value(self, value):
        if not value:
            return ''
        elif isinstance(value, str):
            return value
        else:
            return json.dumps(value)


def validate_year_month(value) -> None:
    """validates the date in format YYYY-MM."""
    regex = r'^\d{4}-\d{2}$'
    if not re.match(regex, value):
        raise ValidationError('Das Feld muss dem Format YYYY-MM entsprechen')

    # Überprüfe ob das Jahr größer oder gleich 2007 ist
    year = int(value[:4])
    if year < 2007:
        raise ValidationError('Das Jahr darf nicht kleiner als 2007 sein')

    # Überprüfe ob das Jahr nicht größer als das aktuelle Jahr ist
    current_year = timezone.now().year
    if year > current_year:
        raise ValidationError(
            'Das Jahr darf nicht größer als das aktuelle Jahr sein')



class Family(models.Model):
    '''family view on admin site to save a new family.'''

    def default_json() -> str: # pylint: disable=[E0211]
        '''returns template for informations-field as json_string'''
        #helping method to generate template for informations field
        default_info = {}
        default_info['childs'] = [""]
        default_info["cpu"] = [""]
        # ex: a) centralized, b) decentralized, c) hybrid
        default_info["topologie"] = ""
        default_info["code_similarity"] = ""
        default_info["category"] = "",
        default_info["attack"] = "",
        default_info["info"] = "",
        default_info["urls"] = [""]
        return json.dumps(default_info)
    
    #this is how django saves and generate family for db
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    alias = models.TextField(default="", blank=True)
    first_seen = models.CharField(
        max_length=7, validators=[validate_year_month])
    last_seen = models.CharField(max_length=7, validators=[
                                 validate_year_month], null=True, blank=True)
    parents = models.CharField(max_length=200, null=True, blank=True)
    bot_size = models.BigIntegerField(default=0)
    open_source = models.BooleanField(default=False)
    white_malware = models.BooleanField(default=False)
    informations = models.JSONField(default=default_json, null=True, blank=True)

    def save(self, *args, **kwargs):
        # Convert JSON object to string before saving to database
        self.informations = json.dumps(self.informations)
        super(Family, self).save(*args, **kwargs)
