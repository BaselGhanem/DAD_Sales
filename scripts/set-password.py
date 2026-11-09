import json,hashlib,pathlib,getpass,sys
p=pathlib.Path(__file__).resolve().parents[1]/'accounts.json'
d=json.loads(p.read_text());uid=input('Username: ').strip();u=next((u for u in d['users'] if u['id']==uid),None)
if not u:sys.exit('Unknown username')
pin=getpass.getpass('New 4-digit PIN: ')
if len(pin)!=4 or not pin.isascii() or not pin.isdigit():sys.exit('PIN must contain exactly 4 ASCII digits')
u['passwordHash']=hashlib.sha256(f'{uid}:{pin}'.encode()).hexdigest();p.write_text(json.dumps(d,ensure_ascii=False,indent=2));print('Updated accounts.json; update credentials.csv accordingly')
