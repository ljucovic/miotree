# README
## mIoTime <img src="/_picture/miotree_logo_background.png" width="100"> <br>

# Praxisseminar - mIoTree

<img src="/_picture/miotree_logo_background.png" width="600"> <br>
mIoTree is a web-based application that uses a database to visualize IoT malware families in a tree diagram, combined with a timeline.<br>
In this version v1.0.1 we habe 100 diffrent iot-maleware-families tracked. 

![IoT Malware Families - Overview](/_pictures/timeline.png)


____________
#### Miotree

Miotree is django webapplication. It use django, saves it data in SQLLite and use d3.js + Formantic-UI for the graphics view.

### Used technlogies
- Django 4.2.1
- Formantic-UI 2.9.2
- d3.js V7
- SQLLite 3.40.1
- python3


# Run on docker
Download the Project. Run Docker-compose with `docker-compose up -d`. 

# Local running
Download the project.
Create a virtualenv activate it and run `python3 manage.py migrate` and `python3 manage.py runserver`

## Example: On Mac
1. clone the project with `git clone ***REMOVED***`
2. move into the folder miotree `cd miotree/`
3. install virtualenv and run `virtualenv miotree`
4. activate miortree `source miotree/bin/activate`
5. migrate everything `python3 manage.py migrate`
6. run miotree with `python3 manage.py runserver`

Now you can reach miotree on http://127.0.0.1:8000.

# Functions
## Hover to get informations
Hover over a family name to get usefull informations.<br>
![Hover function](/_pictures/miotreehover.png)

## Add new Families
To add new families you can use the admin side on http://127.0.0.1:8000/admin/polls/family/
### Important
You have to watch out if you add a new family. 
1. Every date is saved in YYYY-MM-Format
2. Parents needs the id of the parents
     if you have more than one parent, you need to save it with comma and without spaces 
     ex. `18,9,16`

# Database
in the database, the information about the IoT malware families is stored in a polly_family table, in addition to the Django-dependent tables.<br>
![familie table](/_pictures/dbshema.png)

In the column infromations, JSON is saved in text format. The JSON looks like this:
```
{"childs": [""],
     "cpu": ["MIPS"],
     "topologie": "",
     "code_similarity": "",
     "category": [""],
     "attack": ["Wiper"],
     "info": [""],
     "urls": [""]}
```

### Troubleshooting

command to register runner
gitlab-runner register --url ***REMOVED*** --registration-token $REGISTRATION_TOKEN

curl -L -X POST "***REMOVED***" \
     --header "PRIVATE-TOKEN: ***REMOVED***" \
     --form "token=***REMOVED***" --form "description=my-runner" \
     --form "tag_list=amd64,linux,kind"
