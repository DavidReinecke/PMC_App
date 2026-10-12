# Helpers that emit Power Apps pa.yaml for the Workforce Planner screens.
import re
OFF = "If(Parent.Width < 1700, 48, 0)"
PX = "If(Parent.Width < 1000, 16, Parent.Width - 474)"
PW = "If(Parent.Width < 1000, Parent.Width - 32, 458)"
BG = "RGBA(15, 18, 22, 1)"; CARD = "RGBA(23, 28, 34, 1)"; BTN = "RGBA(29, 37, 46, 1)"
TXT = "RGBA(230, 233, 238, 1)"; MUTE = "RGBA(154, 164, 178, 1)"; LINE = "RGBA(56, 66, 78, 1)"
AMB = "RGBA(224, 164, 58, 1)"; DARK = "RGBA(20, 17, 10, 1)"; RED = "RGBA(244, 165, 138, 1)"; GRN = "RGBA(120, 200, 140, 1)"

def val(v, ind):
    v = str(v)
    if '\n' in v or ': ' in v or ' #' in v:
        lines = v.split('\n')
        return '|-\n' + '\n'.join(' ' * (ind + 2) + l for l in lines)
    return v

def ctl(name, control, props, ind=6, variant=None, children=None):
    p = ' ' * ind
    s = f"{p}- {name}:\n{p}    Control: {control}\n"
    if variant: s += f"{p}    Variant: {variant}\n"
    s += f"{p}    Properties:\n"
    for k, v in props:
        v = str(v)
        if not v.startswith('='): v = '=' + v
        s += f"{p}      {k}: " + val(v, ind + 6) + "\n"
    if children:
        s += f"{p}    Children:\n" + ''.join(children)
    return s

def label(name, props, ind=6):
    return ctl(name, 'Label@2.5.1', props, ind)

def button(name, props, ind=6, style='plain'):
    base = {'plain': [('Fill', BTN), ('Color', TXT), ('BorderColor', LINE)],
            'amber': [('Fill', AMB), ('Color', DARK), ('BorderColor', AMB)]}[style]
    base += [('RadiusTopLeft', 8), ('RadiusTopRight', 8), ('RadiusBottomLeft', 8), ('RadiusBottomRight', 8), ('Size', 12)]
    return ctl(name, 'Classic/Button@2.2.0', props + base, ind)

def dd(name, props, ind=6):
    return ctl(name, 'Classic/DropDown@2.3.1', props + [('Size', 12), ('Fill', BTN), ('Color', TXT), ('BorderColor', LINE)], ind)

def txt(name, props, ind=6):
    return ctl(name, 'Classic/TextInput@2.3.2', [('Default', '""')] + props + [('Size', 12), ('Color', TXT), ('Fill', BTN), ('BorderColor', LINE)], ind)

# ---- header (title bar and seven tabs) ----
TABS = [  # key, screen, wide label, short label, width, visible
    ('TO', 'scrTO', 'Tables of Organization', 'Org', 150, 'true'),
    ('Vac', 'scrVac', 'Vacancies & Hiring', 'Vacancies', 140, 'true'),
    ('Appr', 'scrAppr', 'Selection Approvals', 'Approvals', 140, 'true'),
    ('Labor', 'scrLabor', 'Labor Estimate', 'Labor', 110, 'true'),
    ('PMC', 'scrPMC', 'PMC Requests', 'PMC', 110, 'true'),
    ('Inc', 'scrInc', 'Incumbents', 'Incumbents', 100, 'true'),
    ('Roles', 'scrRoles', 'Role Assignments', 'Roles', 120, 'varIsDA'),
]

def header(suffix, area_onchange):
    out = ''
    out += ctl(f'rctHeader{suffix}', 'Rectangle@2.3.0', [('X', 0), ('Y', 0), ('Width', 'Parent.Width'), ('Height', 'If(Parent.Width < 1700, 112, 64)'), ('Fill', CARD)])
    out += label(f'lblApp{suffix}', [('X', 16), ('Y', 16), ('Width', 240), ('Height', 32), ('Text', '"Workforce Planner"'), ('Color', TXT), ('Size', 18), ('FontWeight', 'FontWeight.Bold')])
    n = len(TABS)
    for i, (key, scr, wl, ws, w, vis) in enumerate(TABS):
        cum = sum(t[4] + 8 for t in TABS[:i])
        xw = f"If(Parent.Width >= 1700, 270, 16) + {cum}"
        eq = "(Parent.Width - 32 - 36) / 7"
        xn = f"16 + {i} * ({eq} + 6)"
        cur = (key == suffix)
        out += button(f'btnNav{key}{suffix}', [
            ('X', f"If(Parent.Width < 1000, {xn}, {xw})"),
            ('Y', "If(Parent.Width >= 1700, 10, 58)"),
            ('Width', f"If(Parent.Width < 1000, {eq}, {w})"),
            ('Height', 44),
            ('Text', f'If(Parent.Width < 1000, "{ws}", "{wl}")'),
            ('Visible', vis),
            ('OnSelect', f'Navigate({scr}, ScreenTransition.None)'),
        ], style='amber' if cur else 'plain')
    out += dd(f'ddArea{suffix}', [
        ('X', "If(Parent.Width >= 1000, Parent.Width - 336, 270)"), ('Y', 10),
        ('Width', "If(Parent.Width >= 1000, 200, Parent.Width - 404)"), ('Height', 44),
        ('Items', "'Geographic Areas'"), ('Default', 'varArea.Name'), ('Visible', 'varCanSeeAll'),
        ('OnChange', area_onchange)])
    out += label(f'lblAreaFixed{suffix}', [
        ('X', "If(Parent.Width >= 1000, Parent.Width - 336, 270)"), ('Y', 10),
        ('Width', "If(Parent.Width >= 1000, 200, Parent.Width - 404)"), ('Height', 44),
        ('Text', 'varArea.Name & " · your area"'), ('Visible', '!varCanSeeAll'), ('Color', MUTE), ('Size', 14), ('VerticalAlign', 'VerticalAlign.Middle')])
    out += label(f'lblMe{suffix}', [('X', 'Parent.Width - 126'), ('Y', 10), ('Width', 118), ('Height', 44), ('Text', 'varMe'), ('Color', MUTE), ('Size', 12), ('VerticalAlign', 'VerticalAlign.Middle')])
    return out

AREA_ONCHANGE = 'Set(varArea, Self.Selected); Set(varPanel, ""); ClearCollect(colUnitOpts, {Name: "All units"}, ForAll(Filter(FirstN(Units, 2000), \'Geographic area\'.Name = varArea.Name), {Name: ThisRecord.Name}))'
