import re, sys, glob
from lib import header, AREA_ONCHANGE
SUF = {'scrTO':'TO','scrVac':'Vac','scrAppr':'Appr','scrLabor':'Labor','scrRoles':'Roles'}
for f in glob.glob('../../canvas/Src/scr*.pa.yaml'):
    scr = f.split('/')[-1].split('.')[0]
    if scr not in SUF: continue
    S = SUF[scr]
    L = open(f).read().split('\n')
    a = next(i for i,l in enumerate(L) if l.startswith(f'      - rctHeader{S}:'))
    m = next(i for i,l in enumerate(L) if l.startswith(f'      - lblMe{S}:'))
    b = next(i for i in range(m+1, len(L)) if L[i].startswith('      - '))
    # keep the original area OnChange
    blk = L[a:b]
    j = next(i for i,l in enumerate(blk) if l.startswith(f'      - ddArea{S}:'))
    oc = None
    for k in range(j, len(blk)):
        if blk[k].strip().startswith('OnChange:'):
            if blk[k].strip().endswith('|-'):
                oc = '\n'.join(x.strip() if n else x.strip() for n,x in enumerate(blk[k+1:k+2])); oc = oc.lstrip('=')
            else:
                oc = blk[k].split('OnChange: =',1)[1]
            break
    print(scr, 'onchange same as default:', oc == AREA_ONCHANGE, '' if oc == AREA_ONCHANGE else oc)
    new = header(S, oc if oc else AREA_ONCHANGE).rstrip('\n').split('\n')
    L[a:b] = new
    t = '\n'.join(L).replace('If(Parent.Width < 1000, 48, 0)', 'If(Parent.Width < 1700, 48, 0)')
    open(f,'w').write(t)
