from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('polls', '0024_copy_parents_to_m2m'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='family',
            name='parents',
        ),
        migrations.RenameField(
            model_name='family',
            old_name='parent_families',
            new_name='parents',
        ),
    ]
