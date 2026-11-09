import csv,getpass,pathlib,sys
p=pathlib.Path(__file__).resolve().parents[1]/'credentials.csv'
with p.open(encoding='utf-8-sig',newline='') as f:
 reader=csv.DictReader(f);fields=reader.fieldnames;rows=list(reader)
uid=input('Username: ').strip();row=next((r for r in rows if r['Username']==uid),None)
if row is None:sys.exit('Unknown username')
pin=getpass.getpass('New 4-digit PIN: ')
if len(pin)!=4 or not pin.isascii() or not pin.isdigit():sys.exit('PIN must contain exactly 4 ASCII digits')
row['PIN']=pin
with p.open('w',encoding='utf-8-sig',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)
print('Updated credentials.csv; commit this file to publish the new PIN')
