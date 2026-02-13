from django.db import migrations


def copy_parents_to_m2m(apps, schema_editor):
    Family = apps.get_model('polls', 'Family')
    for family in Family.objects.all():
        if family.parents:
            parent_ids = [
                int(pid.strip())
                for pid in family.parents.split(',')
                if pid.strip()
            ]
            existing_parents = Family.objects.filter(id__in=parent_ids)
            family.parent_families.set(existing_parents)


def copy_m2m_to_parents(apps, schema_editor):
    """Reverse: copy M2M back to comma-separated string."""
    Family = apps.get_model('polls', 'Family')
    for family in Family.objects.all():
        parent_ids = list(
            family.parent_families.values_list('id', flat=True)
        )
        if parent_ids:
            family.parents = ','.join(str(pid) for pid in parent_ids)
        else:
            family.parents = None
        family.save()


class Migration(migrations.Migration):

    dependencies = [
        ('polls', '0023_add_parent_families_m2m'),
    ]

    operations = [
        migrations.RunPython(copy_parents_to_m2m, copy_m2m_to_parents),
    ]
