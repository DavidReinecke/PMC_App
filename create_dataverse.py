#!/usr/bin/env python3
"""Creates the Workforce Planner tables in a Dataverse environment through the Web API
(fallback to importing the solution source), then loads the sample data.

  pip install msal requests
  python create_dataverse.py --org https://YOURORG.crm9.dynamics.com            # GCC
  python create_dataverse.py --org https://YOURORG.crm.microsoftdynamics.us --cloud gcchigh
Add --me you@yourorg.gov to make yourself an all-areas data administrator, and --no-seed to skip the sample data. Safe to re-run: existing tables and columns are skipped.
"""
import argparse, json, sys, time
import msal, requests

CLIENT_ID = '51f81489-12ee-4a9e-aaae-a2591f45987d'  # Microsoft's well-known public client for Dataverse samples
AUTH = {'gcc': 'https://login.microsoftonline.com/organizations', 'gcchigh': 'https://login.microsoftonline.us/organizations'}
SOLUTION, PUBLISHER, PREFIX, OPTPREFIX = 'WorkforcePlanner', 'wfp', 'wfp', 10000

ap = argparse.ArgumentParser()
ap.add_argument('--org', required=True)
ap.add_argument('--cloud', default='gcc', choices=AUTH)
ap.add_argument('--no-seed', action='store_true')
ap.add_argument('--me', help='your sign-in email: adds an all-areas data administrator assignment for you so you can test every screen')
a = ap.parse_args()
ORG = a.org.rstrip('/')
API = ORG + '/api/data/v9.2/'

app = msal.PublicClientApplication(CLIENT_ID, authority=AUTH[a.cloud])
flow = app.initiate_device_flow(scopes=[ORG + '/.default'])
print(flow['message'])
tok = app.acquire_token_by_device_flow(flow)
if 'access_token' not in tok:
    sys.exit(str(tok))
S = requests.Session()
S.headers.update({'Authorization': 'Bearer ' + tok['access_token'], 'Content-Type': 'application/json', 'OData-Version': '4.0', 'Accept': 'application/json'})

def call(method, path, body=None, extra=None, ok=(200, 201, 204)):
    h = dict(extra or {})
    for i in range(6):
        r = S.request(method, path if path.startswith('http') else API + path, json=body, headers=h)
        if r.status_code in ok: return r
        if r.status_code == 429 or (r.status_code == 412) or 'locked' in r.text.lower() or 'another' in r.text.lower() and 'running' in r.text.lower():
            time.sleep(5 * (i + 1)); continue
        return r
    return r

def label(t): return {'@odata.type': 'Microsoft.Dynamics.CRM.Label', 'LocalizedLabels': [{'@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', 'Label': t, 'LanguageCode': 1033}]}
SOL = {'MSCRM.SolutionUniqueName': SOLUTION}

# 1. publisher and solution
r = call('GET', "publishers?$filter=uniquename eq '%s'" % PUBLISHER)
if not r.json()['value']:
    r = call('POST', 'publishers', {'uniquename': PUBLISHER, 'friendlyname': 'Workforce Planner', 'customizationprefix': PREFIX, 'customizationoptionvalueprefix': OPTPREFIX})
    r.raise_for_status()
pub = call('GET', "publishers?$filter=uniquename eq '%s'" % PUBLISHER).json()['value'][0]['publisherid']
if not call('GET', "solutions?$filter=uniquename eq '%s'" % SOLUTION).json()['value']:
    r = call('POST', 'solutions', {'uniquename': SOLUTION, 'friendlyname': 'Workforce Planner', 'version': '1.0.0.0', 'publisherid@odata.bind': '/publishers(%s)' % pub})
    r.raise_for_status()

schema = json.load(open('schema.json'))

def exists_entity(n): return call('GET', "EntityDefinitions(LogicalName='%s')?$select=LogicalName" % n).status_code == 200
def exists_attr(e, n): return call('GET', "EntityDefinitions(LogicalName='%s')/Attributes(LogicalName='%s')?$select=LogicalName" % (e, n)).status_code == 200

# 2. tables
for t in schema:
    n = t['name']
    if exists_entity(n):
        print('table exists', n); continue
    pn, pd, pl = t['primary']
    body = {
        '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata', 'SchemaName': n, 'DisplayName': label(t['display']), 'DisplayCollectionName': label(t['plural']),
        'Description': label(t['desc']), 'OwnershipType': 'UserOwned', 'HasActivities': False, 'HasNotes': False, 'IsActivity': False, 'IsAuditEnabled': {'Value': True},
        'Attributes': [{'@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata', 'SchemaName': pn, 'IsPrimaryName': True, 'RequiredLevel': {'Value': 'SystemRequired'},
                        'MaxLength': pl, 'FormatName': {'Value': 'Text'}, 'DisplayName': label(pd), 'Description': label('')}],
    }
    r = call('POST', 'EntityDefinitions', body, SOL)
    print('create table', n, r.status_code, '' if r.ok else r.text[:300])
    if not r.ok: sys.exit(1)

# 3. columns (non-lookup)
for t in schema:
    n = t['name']
    for logical, disp, kind, arg, note in t['cols']:
        if kind == 'lookup' or exists_attr(n, logical): continue
        common = {'SchemaName': logical, 'DisplayName': label(disp), 'Description': label(note or ''), 'RequiredLevel': {'Value': 'None'}}
        if kind == 'text': m = {'@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata', 'MaxLength': arg, 'FormatName': {'Value': 'Text'}}
        elif kind == 'memo': m = {'@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata', 'MaxLength': arg, 'Format': 'TextArea'}
        elif kind == 'int': m = {'@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata', 'MinValue': arg[0], 'MaxValue': arg[1], 'Format': 'None'}
        elif kind == 'date': m = {'@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata', 'Format': 'DateOnly', 'DateTimeBehavior': {'Value': 'DateOnly'}}
        elif kind == 'bool': m = {'@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata', 'DefaultValue': False, 'OptionSet': {'TrueOption': {'Value': 1, 'Label': label('Yes')}, 'FalseOption': {'Value': 0, 'Label': label('No')}, 'OptionSetType': 'Boolean'}}
        elif kind == 'choice': m = {'@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata', 'OptionSet': {'@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata', 'IsGlobal': False, 'OptionSetType': 'Picklist', 'Options': [{'Value': v, 'Label': label(l)} for v, l in arg]}}
        common.update(m)
        r = call('POST', "EntityDefinitions(LogicalName='%s')/Attributes" % n, common, SOL)
        print('  column', n, logical, r.status_code, '' if r.ok else r.text[:300])
        if not r.ok: sys.exit(1)

# 4. lookups (one-to-many relationships)
for t in schema:
    n = t['name']
    for logical, disp, kind, arg, note in t['cols']:
        if kind != 'lookup' or exists_attr(n, logical): continue
        rel = 'wfp_%s_%s' % (n[4:], logical[4:])
        body = {'@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata', 'SchemaName': rel, 'ReferencedEntity': arg, 'ReferencingEntity': n,
                'CascadeConfiguration': {'Assign': 'NoCascade', 'Delete': 'Restrict', 'Merge': 'NoCascade', 'Reparent': 'NoCascade', 'Share': 'NoCascade', 'Unshare': 'NoCascade'},
                'Lookup': {'@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata', 'SchemaName': logical, 'DisplayName': label(disp), 'Description': label(note or ''), 'RequiredLevel': {'Value': 'None'}}}
        r = call('POST', 'RelationshipDefinitions', body, SOL)
        print('  lookup', n, logical, r.status_code, '' if r.ok else r.text[:300])
        if not r.ok: sys.exit(1)

call('POST', 'PublishAllXml')
print('Tables published.')
if a.no_seed: sys.exit(0)

# 5. sample data
seed = json.load(open('seed_data.json'))
ids = {}   # (table, primary name) -> guid
choice = {t['name']: {c[0]: {l: v for v, l in c[3]} for c in t['cols'] if c[2] == 'choice'} for t in schema}
setname = {}
for t in schema:
    setname[t['name']] = call('GET', "EntityDefinitions(LogicalName='%s')?$select=EntitySetName" % t['name']).json()['EntitySetName']

def lookup_id(table, name):
    key = (table, name)
    if key not in ids:
        r = call('GET', "%s?$select=%sid&$filter=wfp_name eq '%s'" % (setname[table], table, name.replace("'", "''")))
        v = r.json()['value']
        ids[key] = v[0][table + 'id'] if v else None
    return ids[key]

def nav(table, col): return 'wfp_' + col[4:]  # navigation property name equals the lookup schema name

def load(table):
    for rec in seed[table]:
        if lookup_id(table, rec['wfp_name']): continue
        body = {}
        kinds = {c[0]: c for c in next(t for t in schema if t['name'] == table)['cols']}
        for k, v in rec.items():
            if v is None or v == '': continue
            if isinstance(v, list):
                tid = lookup_id(v[0], v[1])
                if not tid: print('  missing', v); continue
                body['%s@odata.bind' % kinds[k][0]] = '/%s(%s)' % (setname[v[0]], tid)
            elif k in choice[table]: body[k] = choice[table][k][v]
            else: body[k] = v
        r = call('POST', setname[table], body)
        print('  seed', table, rec['wfp_name'], r.status_code, '' if r.ok else r.text[:200])
        ids.pop((table, rec['wfp_name']), None)

for tname in ['wfp_geographicarea', 'wfp_unit', 'wfp_position']:
    load(tname)
for pos, sup in seed['_supervisors']:
    pid, sid = lookup_id('wfp_position', pos), lookup_id('wfp_position', sup)
    if pid and sid:
        call('PATCH', "wfp_positions(%s)" % pid if setname['wfp_position'] == 'wfp_positions' else "%s(%s)" % (setname['wfp_position'], pid), {'wfp_supervisor@odata.bind': '/%s(%s)' % (setname['wfp_position'], sid)})
for tname in ['wfp_hiringaction', 'wfp_selectionstep', 'wfp_detail', 'wfp_roleassignment']:
    load(tname)
if a.me:
    body = {'wfp_name': 'Test administrator', 'wfp_useremail': a.me.lower(), 'wfp_role': choice['wfp_roleassignment']['wfp_role']['Data administrator'],
            'wfp_status': choice['wfp_roleassignment']['wfp_status']['Active'], 'wfp_allareas': True}
    r = call('POST', setname['wfp_roleassignment'], body)
    print('  added all-areas data administrator for', a.me, r.status_code, '' if r.ok else r.text[:200])
print('Done. Edit wfp_roleassignment.wfp_useremail and wfp_position.wfp_incumbentemail to real sign-in addresses.')
