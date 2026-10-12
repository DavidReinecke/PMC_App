"""Generates canvas/Src/scrPMC.pa.yaml and canvas/Src/scrInc.pa.yaml.
Run from tools/screens. Needs the Position Requests and Incumbent Updates data sources in base/blank.zip."""
from lib import *

def Y(n):  # a Y that moves down when the header is two rows
    return f"{n} + {OFF}"

def panel_x(extra=0):
    return f"{PX} + 16" if not extra else f"{PX} + 16 + {extra}"

HALF = f"({PW} - 44) / 2"
FULLW = f"{PW} - 32"

def enum(ds, col, var, values):
    """Switch that turns a text value into a choice enum for writing."""
    parts = ', '.join(f'"{v}", \'{col} ({ds})\'.{q(v)}' for v in values)
    return f"Switch({var}, {parts})"

def q(v):
    return f"'{v}'" if re.search(r'[^A-Za-z0-9_]', v) else v

SCREEN_HEAD = """Screens:
  {name}:
    Properties:
      Fill: ={bg}
      OnVisible: |-
        =Set(varNotice, ""); Set(varPanel, ""); Set(varErr, ""){extra}
    Children:
"""

# ---------------------------------------------------------------- PMC Requests
def pmc():
    s = SCREEN_HEAD.format(name='scrPMC', bg=BG, extra='')
    s += header('PMC', AREA_ONCHANGE)
    s += label('lblPMCTitle', [('X', 16), ('Y', Y(76)), ('Width', 'Parent.Width * 0.5 - 24'), ('Height', 40), ('Text', '"PMC Requests"'), ('Color', TXT), ('Size', 24), ('FontWeight', 'FontWeight.Bold')])
    s += label('lblPMCNotice', [('X', 'Parent.Width * 0.5'), ('Y', Y(76)), ('Width', 'Parent.Width * 0.5 - 16'), ('Height', 40), ('Text', 'varNotice'), ('Color', AMB), ('Size', 13), ('VerticalAlign', 'VerticalAlign.Middle')])
    stats = ('With({r: Filter(FirstN(\'Position Requests\', 2000), \'Geographic area\'.Name = varArea.Name)}, '
             '"Waiting on the PMC: " & CountRows(Filter(r, Text(\'Request status\') = "Submitted")) & "   Cleared: " & CountRows(Filter(r, Text(\'Request status\') = "Cleared")) & "   Returned: " & CountRows(Filter(r, Text(\'Request status\') = "Returned")))')
    s += label('lblPMCStats', [('X', 16), ('Y', Y(116)), ('Width', 'Parent.Width - 32'), ('Height', 24), ('Text', stats), ('Color', AMB), ('Size', 13), ('FontWeight', 'FontWeight.Semibold')])
    s += label('lblPMCHelp', [('X', 16), ('Y', Y(142)), ('Width', 'Parent.Width - 32'), ('Height', 24), ('Color', MUTE), ('Size', 12),
        ('Text', '"Ask the PMC to advertise a vacant position or to add a new position. You can edit or withdraw your own request until the PMC clears or returns it."')])
    s += dd('ddPStatus', [('X', 16), ('Y', Y(172)), ('Width', 180), ('Height', 44), ('Items', '["All statuses", "Submitted", "Cleared", "Returned", "Withdrawn"]'), ('Default', '"Submitted"')])
    s += dd('ddPType', [('X', 204), ('Y', Y(172)), ('Width', 200), ('Height', 44), ('Items', '["All types", "Advertise vacancy", "Add position"]'), ('Default', '"All types"')])
    reset = '; '.join(f'Reset({c})' for c in ['ddReqType', 'ddReqPos', 'txtReqTitle', 'ddReqUnit', 'ddReqPlan', 'ddReqGrade', 'ddReqEmp', 'txtReqFund', 'txtReqJust'])
    s += button('btnNewReq', [('X', 412), ('Y', Y(172)), ('Width', 170), ('Height', 44), ('Text', '"New request"'), ('Visible', 'varCanRequest'),
        ('OnSelect', f"Set(varEditReq, LookUp('Position Requests', false)); Set(varPanel, \"req\"); Set(varErr, \"\"); {reset}")], style='amber')
    s += txt('txtPComment', [('X', 16), ('Y', Y(222)), ('Width', f"If(varPanel = \"\", Parent.Width - 32, If(Parent.Width < 1000, Parent.Width - 32, Parent.Width - 506))"), ('Height', 44),
        ('HintText', '"PMC comment (required when returning a request)"'), ('Visible', 'varCanPMC')])
    gy = f"222 + If(varCanPMC, 52, 0) + {OFF}"
    items = ("Sort(Filter(FirstN('Position Requests', 2000), 'Geographic area'.Name = varArea.Name, "
             "ddPStatus.Selected.Value = \"All statuses\" || Text('Request status') = ddPStatus.Selected.Value, "
             "ddPType.Selected.Value = \"All types\" || Text('Request type') = ddPType.Selected.Value), 'Request ID', SortOrder.Descending)")
    own = "Lower(ThisItem.'Requested by email') = varEmail && Text(ThisItem.'Request status') = \"Submitted\""
    pmcv = "varCanPMC && Text(ThisItem.'Request status') = \"Submitted\""
    TW = 'Parent.TemplateWidth'
    plan_w = enum('Position Requests', 'Pay plan', 'Text(ThisItem.\'Pay plan\')', ['GS', 'GW', 'WG'])
    pos_plan = enum('Positions', 'Pay plan', 'Text(ThisItem.\'Pay plan\')', ['GS', 'GW', 'WG'])
    pos_emp = enum('Positions', 'Employment type', 'Text(ThisItem.\'Employment type\')', ['Full time', 'Career seasonal', 'Seasonal'])
    stage_ok = 'Text(vAct.Stage) in ["Draft", "PMC review"]'
    clear_fx = f"""=If(Text(ThisItem.'Request type') = "Advertise vacancy",
    With({{vAct: LookUp(FirstN('Hiring Actions', 2000), Position.'Position ID' = ThisItem.Position.'Position ID')}},
        If(IsBlank(vAct.'Action ID'),
            Patch('Hiring Actions', Defaults('Hiring Actions'), {{'Action ID': "HA-" & Text(Now(), "yymmdd-hhmmss"), Position: LookUp(FirstN(Positions, 2000), 'Position ID' = ThisItem.Position.'Position ID'), 'Geographic area': varArea, Stage: 'Stage (Hiring Actions)'.'Cleared to advertise'}}),
            If({stage_ok}, Patch('Hiring Actions', vAct, {{Stage: 'Stage (Hiring Actions)'.'Cleared to advertise'}})))),
    Patch(Positions, Defaults(Positions), {{'Position ID': "NEW-" & Text(Now(), "yymmdd-hhmmss"), Title: ThisItem.'Proposed title', Unit: ThisItem.Unit, 'Geographic area': varArea, 'Pay plan': {pos_plan}, 'Full performance grade': ThisItem.'Full performance grade', 'Employment type': {pos_emp}, 'Position status': 'Position status (Positions)'.Vacant, 'Funding status': 'Funding status (Positions)'.Approved, Incumbent: "", 'Incumbent email': ""}}));
Patch('Position Requests', ThisItem, {{'Request status': 'Request status (Position Requests)'.Cleared, 'Decided by': varMe, 'Decided on': Today(), 'PMC comment': txtPComment.Text}});
Patch('Hiring Events', Defaults('Hiring Events'), {{Summary: "PMC cleared " & ThisItem.'Request ID' & " (" & Text(ThisItem.'Request type') & ")", 'Event type': 'Event type (Hiring Events)'.'Stage change', 'Geographic area': varArea, By: varMe, Note: txtPComment.Text}});
Reset(txtPComment);
Set(varNotice, If(Text(ThisItem.'Request type') = "Advertise vacancy", "Cleared to advertise. The hiring action is on Vacancies & Hiring.", "Position added to the table of organization as vacant. Rename its Position ID if you use position numbers."))"""
    return_fx = """=If(IsBlank(txtPComment.Text),
    Set(varNotice, "Add a comment before returning a request."),
    Patch('Position Requests', ThisItem, {'Request status': 'Request status (Position Requests)'.Returned, 'Decided by': varMe, 'Decided on': Today(), 'PMC comment': txtPComment.Text});
    Patch('Hiring Events', Defaults('Hiring Events'), {Summary: "PMC returned " & ThisItem.'Request ID', 'Event type': 'Event type (Hiring Events)'.'Stage change', 'Geographic area': varArea, By: varMe, Note: txtPComment.Text});
    Reset(txtPComment);
    Set(varNotice, "Returned to " & ThisItem.'Requested by' & "."))"""
    edit_fx = f"Set(varEditReq, ThisItem); Set(varPanel, \"req\"); Set(varErr, \"\"); {reset}"
    withdraw_fx = """=Patch('Position Requests', ThisItem, {'Request status': 'Request status (Position Requests)'.Withdrawn});
Set(varNotice, "Request withdrawn.")"""
    kids = []
    kids.append(ctl('rctPReqRow', 'Rectangle@2.3.0', [('X', 0), ('Y', 0), ('Width', f'{TW} - 12'), ('Height', f'Parent.TemplateHeight - 8'), ('Fill', CARD), ('BorderColor', LINE), ('BorderThickness', 1)], 12))
    kids.append(label('lblPReqId', [('X', 12), ('Y', 6), ('Width', f'{TW} - 200'), ('Height', 28), ('Color', TXT), ('Size', 15), ('FontWeight', 'FontWeight.Semibold'),
        ('Text', 'ThisItem.\'Request ID\' & " · " & Text(ThisItem.\'Request type\')')], 12))
    kids.append(label('lblPReqStatus', [('X', f'{TW} - 12 - 150'), ('Y', 6), ('Width', 138), ('Height', 28), ('Align', 'Align.Right'), ('Size', 13), ('FontWeight', 'FontWeight.Semibold'),
        ('Color', 'Switch(Text(ThisItem.\'Request status\'), "Cleared", RGBA(120, 200, 140, 1), "Returned", RGBA(244, 165, 138, 1), "Withdrawn", RGBA(154, 164, 178, 1), RGBA(224, 164, 58, 1))'),
        ('Text', 'Text(ThisItem.\'Request status\')')], 12))
    kids.append(label('lblPReqSub', [('X', 12), ('Y', 36), ('Width', f'{TW} - 36'), ('Height', 24), ('Color', TXT), ('Size', 13),
        ('Text', 'If(Text(ThisItem.\'Request type\') = "Advertise vacancy", ThisItem.Position.\'Position ID\' & " · " & LookUp(FirstN(Positions, 2000), \'Position ID\' = ThisItem.Position.\'Position ID\').Title, ThisItem.\'Proposed title\' & " · " & Text(ThisItem.\'Pay plan\') & "-" & ThisItem.\'Full performance grade\' & " · " & Text(ThisItem.\'Employment type\') & " · " & ThisItem.Unit.Name)')], 12))
    kids.append(label('lblPReqMeta', [('X', 12), ('Y', 60), ('Width', f'{TW} - 36'), ('Height', 24), ('Color', MUTE), ('Size', 12),
        ('Text', '"Requested by " & ThisItem.\'Requested by\' & " on " & Text(ThisItem.\'Request date\', "mmm d, yyyy") & " · Funding: " & ThisItem.\'Funding source\'')], 12))
    kids.append(label('lblPReqJust', [('X', 12), ('Y', 84), ('Width', f'{TW} - 36'), ('Height', 24), ('Color', MUTE), ('Size', 12),
        ('Text', 'ThisItem.Justification & If(!IsBlank(ThisItem.\'PMC comment\'), "   |   PMC: " & ThisItem.\'PMC comment\', "")')], 12))
    bw = 'Parent.TemplateHeight - 8 - 42'
    kids.append(button('btnReqClear', [('X', f'{TW} - 12 - 8 - 150 - 8 - 80 - 8 - 70 - 8 - 90'), ('Y', bw), ('Width', 150), ('Height', 34), ('Text', 'If(Text(ThisItem.\'Request type\') = "Advertise vacancy", "Clear to advertise", "Approve position")'), ('Visible', pmcv), ('OnSelect', clear_fx)], 12, style='amber'))
    kids.append(button('btnReqReturn', [('X', f'{TW} - 12 - 8 - 80 - 8 - 70 - 8 - 90'), ('Y', bw), ('Width', 80), ('Height', 34), ('Text', '"Return"'), ('Visible', pmcv), ('OnSelect', return_fx)], 12))
    kids.append(button('btnReqEdit', [('X', f'{TW} - 12 - 8 - 70 - 8 - 90'), ('Y', bw), ('Width', 70), ('Height', 34), ('Text', '"Edit"'), ('Visible', own), ('OnSelect', edit_fx)], 12))
    kids.append(button('btnReqWithdraw', [('X', f'{TW} - 12 - 8 - 90'), ('Y', bw), ('Width', 90), ('Height', 34), ('Text', '"Withdraw"'), ('Visible', own), ('OnSelect', withdraw_fx)], 12))
    s += ctl('galReq', 'Gallery@2.15.0', [
        ('X', 16), ('Y', gy), ('Width', 'If(varPanel = "", Parent.Width - 32, If(Parent.Width < 1000, Parent.Width - 32, Parent.Width - 506))'),
        ('Height', f'Parent.Height - ({gy}) - 16'), ('TemplateSize', 160), ('TemplatePadding', 6), ('Items', items), ('Fill', BG)], 6, variant='Vertical', children=kids)

    # ---- request form panel
    T = Y(172)
    vis = 'varPanel = "req"'
    visAdd = 'varPanel = "req" && ddReqType.Selected.Value = "Add position"'
    visAdv = 'varPanel = "req" && ddReqType.Selected.Value = "Advertise vacancy"'
    sh = 'If(ddReqType.Selected.Value = "Add position", 0, 112)'
    s += ctl('rctReqPanel', 'Rectangle@2.3.0', [('X', PX), ('Y', T), ('Width', PW), ('Height', f'If(ddReqType.Selected.Value = "Add position", 508, 396)'), ('Fill', CARD), ('BorderColor', AMB), ('BorderThickness', 1), ('Visible', vis)])
    s += label('lblReqTitle', [('X', panel_x()), ('Y', f'{T} + 10'), ('Width', FULLW), ('Height', 30), ('Visible', vis), ('Color', TXT), ('Size', 16), ('FontWeight', 'FontWeight.Bold'),
        ('Text', 'If(IsBlank(varEditReq.\'Request ID\'), "New request to the PMC", "Edit " & varEditReq.\'Request ID\')')])
    def lab(name, text, y, visible, x=None, w=None):
        return label(name, [('X', x or panel_x()), ('Y', y), ('Width', w or FULLW), ('Height', 18), ('Visible', visible), ('Color', MUTE), ('Size', 12), ('Text', text)])
    s += lab('lblRqType', '"Request type"', f'{T} + 44', vis)
    s += dd('ddReqType', [('X', panel_x()), ('Y', f'{T} + 62'), ('Width', FULLW), ('Height', 36), ('Visible', vis), ('Items', 'colChReqType'),
        ('Default', 'If(IsBlank(varEditReq.\'Request ID\'), "Advertise vacancy", Text(varEditReq.\'Request type\'))')])
    s += lab('lblRqPos', '"Vacant position"', f'{T} + 104', visAdv)
    s += dd('ddReqPos', [('X', panel_x()), ('Y', f'{T} + 122'), ('Width', FULLW), ('Height', 36), ('Visible', visAdv),
        ('Items', "ForAll(Sort(Filter(FirstN(Positions, 2000), 'Geographic area'.Name = varArea.Name, Text('Position status') = \"Vacant\", varCanPMC || 'Supervisor position'.'Position ID' in colMyPos.'Position ID'), 'Position ID'), {Value: 'Position ID' & \" · \" & Title, pid: 'Position ID'})"),
        ('Default', 'If(IsBlank(varEditReq.Position.\'Position ID\'), "", varEditReq.Position.\'Position ID\' & " · " & LookUp(FirstN(Positions, 2000), \'Position ID\' = varEditReq.Position.\'Position ID\').Title)')])
    s += lab('lblRqTitleIn', '"Proposed title"', f'{T} + 104', visAdd)
    s += txt('txtReqTitle', [('X', panel_x()), ('Y', f'{T} + 122'), ('Width', FULLW), ('Height', 36), ('Visible', visAdd), ('Default', 'varEditReq.\'Proposed title\'')])
    hx = panel_x(f'{HALF} + 12')
    s += lab('lblRqUnit', '"Unit"', f'{T} + 164', visAdd, w=HALF)
    s += lab('lblRqEmp', '"Employment type"', f'{T} + 164', visAdd, x=hx, w=HALF)
    s += dd('ddReqUnit', [('X', panel_x()), ('Y', f'{T} + 182'), ('Width', HALF), ('Height', 36), ('Visible', visAdd),
        ('Items', "ForAll(Filter(FirstN(Units, 2000), 'Geographic area'.Name = varArea.Name), {Value: Name})"), ('Default', 'varEditReq.Unit.Name')])
    s += dd('ddReqEmp', [('X', hx), ('Y', f'{T} + 182'), ('Width', HALF), ('Height', 36), ('Visible', visAdd), ('Items', 'colChEmp'),
        ('Default', 'If(IsBlank(varEditReq.\'Request ID\'), "Full time", Text(varEditReq.\'Employment type\'))')])
    s += lab('lblRqPlan', '"Pay plan"', f'{T} + 224', visAdd, w=HALF)
    s += lab('lblRqGrade', '"Full performance grade"', f'{T} + 224', visAdd, x=hx, w=HALF)
    s += dd('ddReqPlan', [('X', panel_x()), ('Y', f'{T} + 242'), ('Width', HALF), ('Height', 36), ('Visible', visAdd), ('Items', 'colChPlan'),
        ('Default', 'If(IsBlank(varEditReq.\'Request ID\'), "GS", Text(varEditReq.\'Pay plan\'))')])
    s += dd('ddReqGrade', [('X', hx), ('Y', f'{T} + 242'), ('Width', HALF), ('Height', 36), ('Visible', visAdd), ('Items', 'Sequence(15)'),
        ('Default', 'Coalesce(varEditReq.\'Full performance grade\', 11)')])
    fy = f'{T} + If(ddReqType.Selected.Value = "Add position", 288, 176)'
    jy = f'{T} + If(ddReqType.Selected.Value = "Add position", 352, 240)'
    ey = f'{T} + If(ddReqType.Selected.Value = "Add position", 444, 332)'
    by = f'{T} + If(ddReqType.Selected.Value = "Add position", 460, 348)'
    s += lab('lblRqFund', '"Funding source"', fy, vis)
    s += txt('txtReqFund', [('X', panel_x()), ('Y', f'{fy} + 18'), ('Width', FULLW), ('Height', 36), ('Visible', vis), ('HintText', '"Fund or project the position is paid from"'), ('Default', 'varEditReq.\'Funding source\'')])
    s += lab('lblRqJust', '"Justification"', jy, vis)
    s += txt('txtReqJust', [('X', panel_x()), ('Y', f'{jy} + 18'), ('Width', FULLW), ('Height', 72), ('Visible', vis), ('Mode', 'TextMode.MultiLine'), ('Default', 'varEditReq.Justification')])
    s += label('lblReqErr', [('X', panel_x()), ('Y', f'{jy} + 94'), ('Width', FULLW), ('Height', 22), ('Visible', vis), ('Color', RED), ('Size', 12), ('Text', 'varErr')])
    fields = f"""'Request type': Switch(ddReqType.Selected.Value, "Advertise vacancy", 'Request type (Position Requests)'.'Advertise vacancy', 'Request type (Position Requests)'.'Add position'),
                    Position: If(vAdd, Blank(), LookUp(FirstN(Positions, 2000), 'Position ID' = vPid)),
                    Unit: If(vAdd, LookUp(Filter(FirstN(Units, 2000), 'Geographic area'.Name = varArea.Name), Name = ddReqUnit.Selected.Value), Blank()),
                    'Geographic area': varArea,
                    'Proposed title': If(vAdd, txtReqTitle.Text, ""),
                    'Pay plan': {enum('Position Requests', 'Pay plan', 'ddReqPlan.Selected.Value', ['GS', 'GW', 'WG'])},
                    'Full performance grade': ddReqGrade.Selected.Value,
                    'Employment type': {enum('Position Requests', 'Employment type', 'ddReqEmp.Selected.Value', ['Full time', 'Career seasonal', 'Seasonal'])},
                    Justification: txtReqJust.Text,
                    'Funding source': txtReqFund.Text"""
    save_fx = f"""=With({{vAdd: ddReqType.Selected.Value = "Add position", vPid: ddReqPos.Selected.pid}},
    If(vAdd && IsBlank(txtReqTitle.Text), Set(varErr, "Enter the proposed title."),
    If(vAdd && IsBlank(ddReqUnit.Selected.Value), Set(varErr, "Choose the unit."),
    If(!vAdd && IsBlank(vPid), Set(varErr, "Choose the vacant position."),
    If(IsBlank(txtReqFund.Text), Set(varErr, "Enter the funding source."),
    If(IsBlank(txtReqJust.Text), Set(varErr, "Enter a justification."),
    If(!vAdd && CountRows(Filter(FirstN('Position Requests', 2000), Position.'Position ID' = vPid, Text('Request status') = "Submitted", 'Request ID' <> Coalesce(varEditReq.'Request ID', ""))) > 0, Set(varErr, "That position already has an open request."),
        If(IsBlank(varEditReq.'Request ID'),
            Patch('Position Requests', Defaults('Position Requests'), {{
                    'Request ID': "PR-" & Text(Now(), "yymmdd-hhmmss"),
                    {fields},
                    'Requested by': varMe,
                    'Requested by email': varEmail,
                    'Request date': Today(),
                    'Request status': 'Request status (Position Requests)'.Submitted}});
            Set(varNotice, "Request submitted to the PMC."),
            Patch('Position Requests', varEditReq, {{
                    {fields}}});
            Set(varNotice, "Request updated."));
        Set(varPanel, ""); Set(varErr, ""))))))))"""
    s += button('btnReqSave', [('X', panel_x()), ('Y', by), ('Width', HALF), ('Height', 40), ('Text', 'If(IsBlank(varEditReq.\'Request ID\'), "Submit to PMC", "Save changes")'), ('Visible', vis), ('OnSelect', save_fx)], style='amber')
    s += button('btnReqClose', [('X', panel_x(f'{HALF} + 12')), ('Y', by), ('Width', HALF), ('Height', 40), ('Text', '"Cancel"'), ('Visible', vis), ('OnSelect', 'Set(varPanel, ""); Set(varErr, "")')])
    return s

# ---------------------------------------------------------------- Incumbent updates
def inc():
    s = SCREEN_HEAD.format(name='scrInc', bg=BG, extra='')
    s += header('Inc', AREA_ONCHANGE)
    s += label('lblIncTitle', [('X', 16), ('Y', Y(76)), ('Width', 'Parent.Width * 0.5 - 24'), ('Height', 40), ('Text', '"Incumbent Updates"'), ('Color', TXT), ('Size', 24), ('FontWeight', 'FontWeight.Bold')])
    s += label('lblIncNotice', [('X', 'Parent.Width * 0.5'), ('Y', Y(76)), ('Width', 'Parent.Width * 0.5 - 16'), ('Height', 40), ('Text', 'varNotice'), ('Color', AMB), ('Size', 13), ('VerticalAlign', 'VerticalAlign.Middle')])
    stats = ('With({r: Filter(FirstN(\'Incumbent Updates\', 2000), \'Geographic area\'.Name = varArea.Name)}, '
             '"Waiting to be applied: " & CountRows(Filter(r, Text(\'Update status\') = "Pending")) & "   Applied: " & CountRows(Filter(r, Text(\'Update status\') = "Applied")) & "   Rejected: " & CountRows(Filter(r, Text(\'Update status\') = "Rejected")))')
    s += label('lblIncStats', [('X', 16), ('Y', Y(116)), ('Width', 'Parent.Width - 32'), ('Height', 24), ('Text', stats), ('Color', AMB), ('Size', 13), ('FontWeight', 'FontWeight.Semibold')])
    s += label('lblIncHelp', [('X', 16), ('Y', Y(142)), ('Width', 'Parent.Width - 32'), ('Height', 24), ('Color', MUTE), ('Size', 12),
        ('Text', '"Supervisors request who occupies a position. A chief or data administrator applies the update, which changes the table of organization."')])
    s += dd('ddIStatus', [('X', 16), ('Y', Y(172)), ('Width', 180), ('Height', 44), ('Items', '["All statuses", "Pending", "Applied", "Rejected"]'), ('Default', '"Pending"')])
    reset = '; '.join(f'Reset({c})' for c in ['ddIncPos', 'ddIncType', 'txtIncNewName', 'txtIncNewEmail', 'dpIncDate', 'txtIncReason'])
    s += button('btnNewInc', [('X', 204), ('Y', Y(172)), ('Width', 190), ('Height', 44), ('Text', '"Request an update"'), ('Visible', 'varCanDetail'),
        ('OnSelect', f'Set(varPanel, "inc"); Set(varErr, ""); {reset}')], style='amber')
    s += txt('txtIComment', [('X', 16), ('Y', Y(222)), ('Width', 'If(varPanel = "", Parent.Width - 32, If(Parent.Width < 1000, Parent.Width - 32, Parent.Width - 506))'), ('Height', 44),
        ('HintText', '"Comment (optional when applying, shown when rejecting)"'), ('Visible', 'varCanEditInc')])
    gy = f"222 + If(varCanEditInc, 52, 0) + {OFF}"
    items = ("Sort(Filter(FirstN('Incumbent Updates', 2000), 'Geographic area'.Name = varArea.Name, "
             "ddIStatus.Selected.Value = \"All statuses\" || Text('Update status') = ddIStatus.Selected.Value), 'Update ID', SortOrder.Descending)")
    TW = 'Parent.TemplateWidth'
    pend = 'Text(ThisItem.\'Update status\') = "Pending"'
    apply_fx = """=With({vPid: ThisItem.Position.'Position ID'},
    With({vPos: LookUp(FirstN(Positions, 2000), 'Position ID' = vPid)},
        If(Text(ThisItem.'Update type') = "Vacate",
            Patch(Positions, vPos, {'Previous incumbent': vPos.Incumbent, Incumbent: "", 'Incumbent email': "", 'Position status': 'Position status (Positions)'.Vacant}),
            Patch(Positions, vPos, {Incumbent: ThisItem.'New incumbent', 'Incumbent email': Lower(ThisItem.'New incumbent email'), 'Position status': 'Position status (Positions)'.Filled, 'Previous incumbent': ""}));
        Patch('Incumbent Updates', ThisItem, {'Update status': 'Update status (Incumbent Updates)'.Applied, 'Decided by': varMe, 'Decided on': Today(), Comment: txtIComment.Text});
        Patch('Hiring Events', Defaults('Hiring Events'), {Summary: "Applied " & ThisItem.'Update ID' & " (" & Text(ThisItem.'Update type') & ") to " & vPid, 'Event type': 'Event type (Hiring Events)'.'Incumbent change', 'Geographic area': varArea, By: varMe, Note: txtIComment.Text});
        ClearCollect(colMyPos, Filter(Positions, 'Incumbent email' = varEmail));
        Reset(txtIComment);
        Set(varNotice, "Applied to " & vPid & ".")))"""
    reject_fx = """=If(IsBlank(txtIComment.Text),
    Set(varNotice, "Add a comment before rejecting an update."),
    Patch('Incumbent Updates', ThisItem, {'Update status': 'Update status (Incumbent Updates)'.Rejected, 'Decided by': varMe, 'Decided on': Today(), Comment: txtIComment.Text});
    Reset(txtIComment);
    Set(varNotice, "Update rejected."))"""
    withdraw_fx = """=Patch('Incumbent Updates', ThisItem, {'Update status': 'Update status (Incumbent Updates)'.Rejected, 'Decided by': varMe, 'Decided on': Today(), Comment: "Withdrawn by requester"});
Set(varNotice, "Update withdrawn.")"""
    own = f"{pend} && Lower(ThisItem.'Requested by email') = varEmail"
    kids = []
    kids.append(ctl('rctIncRow', 'Rectangle@2.3.0', [('X', 0), ('Y', 0), ('Width', f'{TW} - 12'), ('Height', 'Parent.TemplateHeight - 8'), ('Fill', CARD), ('BorderColor', LINE), ('BorderThickness', 1)], 12))
    kids.append(label('lblIncId', [('X', 12), ('Y', 6), ('Width', f'{TW} - 200'), ('Height', 28), ('Color', TXT), ('Size', 15), ('FontWeight', 'FontWeight.Semibold'),
        ('Text', 'ThisItem.\'Update ID\' & " · " & ThisItem.Position.\'Position ID\' & " · " & LookUp(FirstN(Positions, 2000), \'Position ID\' = ThisItem.Position.\'Position ID\').Title')], 12))
    kids.append(label('lblIncStatus', [('X', f'{TW} - 12 - 150'), ('Y', 6), ('Width', 138), ('Height', 28), ('Align', 'Align.Right'), ('Size', 13), ('FontWeight', 'FontWeight.Semibold'),
        ('Color', 'Switch(Text(ThisItem.\'Update status\'), "Applied", RGBA(120, 200, 140, 1), "Rejected", RGBA(244, 165, 138, 1), RGBA(224, 164, 58, 1))'),
        ('Text', 'Text(ThisItem.\'Update status\')')], 12))
    kids.append(label('lblIncWhat', [('X', 12), ('Y', 36), ('Width', f'{TW} - 36'), ('Height', 24), ('Color', TXT), ('Size', 13),
        ('Text', 'Text(ThisItem.\'Update type\') & ": " & Coalesce(LookUp(FirstN(Positions, 2000), \'Position ID\' = ThisItem.Position.\'Position ID\').Incumbent, "vacant") & If(Text(ThisItem.\'Update type\') = "Vacate", " leaves the position", " to " & ThisItem.\'New incumbent\' & " (" & ThisItem.\'New incumbent email\' & ")") & If(!IsBlank(ThisItem.\'Effective date\'), " · effective " & Text(ThisItem.\'Effective date\', "mmm d, yyyy"), "")')], 12))
    kids.append(label('lblIncMeta', [('X', 12), ('Y', 60), ('Width', f'{TW} - 36'), ('Height', 24), ('Color', MUTE), ('Size', 12),
        ('Text', '"Requested by " & ThisItem.\'Requested by\' & " on " & Text(ThisItem.\'Created On\', "mmm d, yyyy")')], 12))
    kids.append(label('lblIncReason', [('X', 12), ('Y', 84), ('Width', f'{TW} - 36'), ('Height', 24), ('Color', MUTE), ('Size', 12),
        ('Text', 'ThisItem.Reason & If(!IsBlank(ThisItem.Comment), "   |   " & ThisItem.\'Decided by\' & ": " & ThisItem.Comment, "")')], 12))
    bw = 'Parent.TemplateHeight - 8 - 42'
    kids.append(button('btnIncApply', [('X', f'{TW} - 12 - 8 - 90 - 8 - 80 - 8 - 90'), ('Y', bw), ('Width', 90), ('Height', 34), ('Text', '"Apply"'), ('Visible', f'varCanEditInc && {pend}'), ('OnSelect', apply_fx)], 12, style='amber'))
    kids.append(button('btnIncReject', [('X', f'{TW} - 12 - 8 - 80 - 8 - 90'), ('Y', bw), ('Width', 80), ('Height', 34), ('Text', '"Reject"'), ('Visible', f'varCanEditInc && {pend}'), ('OnSelect', reject_fx)], 12))
    kids.append(button('btnIncWithdraw', [('X', f'{TW} - 12 - 8 - 90'), ('Y', bw), ('Width', 90), ('Height', 34), ('Text', '"Withdraw"'), ('Visible', own), ('OnSelect', withdraw_fx)], 12))
    s += ctl('galInc', 'Gallery@2.15.0', [
        ('X', 16), ('Y', gy), ('Width', 'If(varPanel = "", Parent.Width - 32, If(Parent.Width < 1000, Parent.Width - 32, Parent.Width - 506))'),
        ('Height', f'Parent.Height - ({gy}) - 16'), ('TemplateSize', 160), ('TemplatePadding', 6), ('Items', items), ('Fill', BG)], 6, variant='Vertical', children=kids)

    T = Y(172)
    vis = 'varPanel = "inc"'
    visNew = 'varPanel = "inc" && ddIncType.Selected.Value <> "Vacate"'
    s += ctl('rctIncPanel', 'Rectangle@2.3.0', [('X', PX), ('Y', T), ('Width', PW), ('Height', 508), ('Fill', CARD), ('BorderColor', AMB), ('BorderThickness', 1), ('Visible', vis)])
    s += label('lblIncPTitle', [('X', panel_x()), ('Y', f'{T} + 10'), ('Width', FULLW), ('Height', 30), ('Visible', vis), ('Color', TXT), ('Size', 16), ('FontWeight', 'FontWeight.Bold'), ('Text', '"Request an incumbent update"')])
    def lab(name, text, y, visible):
        return label(name, [('X', panel_x()), ('Y', y), ('Width', FULLW), ('Height', 18), ('Visible', visible), ('Color', MUTE), ('Size', 12), ('Text', text)])
    s += lab('lblIPos', '"Position"', f'{T} + 44', vis)
    s += dd('ddIncPos', [('X', panel_x()), ('Y', f'{T} + 62'), ('Width', FULLW), ('Height', 36), ('Visible', vis),
        ('Items', "ForAll(Sort(Filter(FirstN(Positions, 2000), 'Geographic area'.Name = varArea.Name, varCanEditInc || 'Supervisor position'.'Position ID' in colMyPos.'Position ID'), 'Position ID'), {Value: 'Position ID' & \" · \" & Title & \" · \" & If(Text('Position status') = \"Filled\", Incumbent, \"Vacant\"), pid: 'Position ID'})")])
    s += lab('lblIType', '"Update type"', f'{T} + 104', vis)
    s += dd('ddIncType', [('X', panel_x()), ('Y', f'{T} + 122'), ('Width', FULLW), ('Height', 36), ('Visible', vis), ('Items', 'colChUpdType'), ('Default', '"Fill"')])
    s += lab('lblIName', '"New incumbent name"', f'{T} + 164', visNew)
    s += txt('txtIncNewName', [('X', panel_x()), ('Y', f'{T} + 182'), ('Width', FULLW), ('Height', 36), ('Visible', visNew)])
    s += lab('lblIEmail', '"New incumbent sign-in email"', f'{T} + 224', visNew)
    s += txt('txtIncNewEmail', [('X', panel_x()), ('Y', f'{T} + 242'), ('Width', FULLW), ('Height', 36), ('Visible', visNew)])
    s += lab('lblIDate', '"Effective date"', f'{T} + 284', vis)
    s += ctl('dpIncDate', 'Classic/DatePicker@2.6.0', [('X', panel_x()), ('Y', f'{T} + 302'), ('Width', FULLW), ('Height', 36), ('Visible', vis), ('DefaultDate', 'Today()')])
    s += lab('lblIReason', '"Reason"', f'{T} + 344', vis)
    s += txt('txtIncReason', [('X', panel_x()), ('Y', f'{T} + 362'), ('Width', FULLW), ('Height', 64), ('Visible', vis), ('Mode', 'TextMode.MultiLine')])
    s += label('lblIncUpdErr', [('X', panel_x()), ('Y', f'{T} + 430'), ('Width', FULLW), ('Height', 22), ('Visible', vis), ('Color', RED), ('Size', 12), ('Text', 'varErr')])
    save_fx = f"""=With({{vPid: ddIncPos.Selected.pid, vType: ddIncType.Selected.Value}},
    If(IsBlank(vPid), Set(varErr, "Choose the position."),
    If(vType <> "Vacate" && IsBlank(txtIncNewName.Text), Set(varErr, "Enter the new incumbent's name."),
    If(vType <> "Vacate" && !IsMatch(txtIncNewEmail.Text, Match.Email), Set(varErr, "Enter a valid sign-in email."),
    If(IsBlank(txtIncReason.Text), Set(varErr, "Enter a reason."),
    If(CountRows(Filter(FirstN('Incumbent Updates', 2000), Position.'Position ID' = vPid, Text('Update status') = "Pending")) > 0, Set(varErr, "That position already has an update waiting."),
        Patch('Incumbent Updates', Defaults('Incumbent Updates'), {{
                'Update ID': "IU-" & Text(Now(), "yymmdd-hhmmss"),
                Position: LookUp(FirstN(Positions, 2000), 'Position ID' = vPid),
                'Geographic area': varArea,
                'Update type': {enum('Incumbent Updates', 'Update type', 'vType', ['Fill', 'Change incumbent', 'Vacate'])},
                'New incumbent': If(vType = "Vacate", "", txtIncNewName.Text),
                'New incumbent email': If(vType = "Vacate", "", Lower(txtIncNewEmail.Text)),
                'Effective date': dpIncDate.SelectedDate,
                Reason: txtIncReason.Text,
                'Requested by': varMe,
                'Requested by email': varEmail,
                'Update status': 'Update status (Incumbent Updates)'.Pending}});
        Set(varNotice, "Update submitted for " & vPid & ".");
        Set(varPanel, ""); Set(varErr, "")))))))"""
    s += button('btnIncUpdSave', [('X', panel_x()), ('Y', f'{T} + 456'), ('Width', HALF), ('Height', 40), ('Text', '"Submit update"'), ('Visible', vis), ('OnSelect', save_fx)], style='amber')
    s += button('btnIncUpdClose', [('X', panel_x(f'{HALF} + 12')), ('Y', f'{T} + 456'), ('Width', HALF), ('Height', 40), ('Text', '"Cancel"'), ('Visible', vis), ('OnSelect', 'Set(varPanel, ""); Set(varErr, "")')])
    return s

if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else '../../canvas/Src'
    open(f'{out}/scrPMC.pa.yaml', 'w').write(pmc())
    open(f'{out}/scrInc.pa.yaml', 'w').write(inc())
    print('written')
