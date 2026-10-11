# Canvas build guide (fallback to the YAML)

Use this if pasting the YAML into Power Apps Studio does not work. Build the screens in this order. Every control is listed with its position and properties. Formulas are exact; paste them as shown.

Before you start: create a **tablet** canvas app (1366 x 768) in the same environment as the tables, add all eight tables as data sources, set **Settings > General > Data row limit** to 2000, then paste `App.OnStart` (in `canvas/Src/App.pa.yaml`, or the block below) into the **App** object and run it once (App > ... > Run OnStart).
Control naming matters: formulas refer to each other by these names. Use the Dropdown / Text input / Label / Button controls from **Insert > Classic** (the formulas use classic properties such as `Items`, `Value`, `Default`, `Selected`).

### App.OnStart

```
Set(varEmail, Lower(User().Email));
Set(varMe, User().FullName);
// Choice lists used when writing choice columns
ClearCollect(colChStage, Choices([@'Hiring Actions'].Stage));
ClearCollect(colChPosStatus, Choices([@Positions].'Position status'));
ClearCollect(colChFunding, Choices([@Positions].'Funding status'));
ClearCollect(colChApprover, Choices([@'Selection Approval Steps'].'Approver group'));
ClearCollect(colChDecision, Choices([@'Selection Approval Steps'].Decision));
ClearCollect(colChRole, Choices([@'Role Assignments'].Role));
ClearCollect(colChAssign, Choices([@'Role Assignments'].'Assignment status'));
ClearCollect(colChEvent, Choices([@'Hiring Events'].'Event type'));
// Who am I
ClearCollect(colMyRoles, ForAll(Filter('Role Assignments', Lower('User email') = varEmail && 'Assignment status'.Value = "Active"), {role: ThisRecord.Role.Value, allAreas: ThisRecord.'All areas', area: ThisRecord.'Geographic area'.Code}));
ClearCollect(colMyPos, Filter(Positions, 'Incumbent email' = varEmail));
ClearCollect(colAreas, 'Geographic Areas');
Set(varIsDAAll, CountRows(Filter(colMyRoles, role = "Data administrator" && allAreas)) > 0);
Set(varIsDA, CountRows(Filter(colMyRoles, role = "Data administrator")) > 0);
Set(varIsChief, CountRows(Filter(colMyRoles, role in ["Area fire chief", "Deputy chief", "Assistant Chief Operations", "Assistant Chief Support Services"])) > 0);
Set(varIsBudget, CountRows(Filter(colMyRoles, role = "Budget")) > 0);
Set(varIsSup, CountRows(Filter(Positions, 'Supervisor position'.'Position ID' in colMyPos.'Position ID')) > 0);
Set(varCanSeeAll, varIsChief || varIsDAAll);
Set(varCanEditInc, varIsDA || varIsChief);
Set(varCanDetail, varIsSup || varIsDA || varIsChief);
Set(varCanEditHiring, varIsSup || varIsDA);
Set(varCanFund, varIsBudget || varIsDA);
// Starting area: my role's area, else my position's area
Set(varArea, Coalesce(LookUp(colAreas, Code = First(Filter(colMyRoles, !IsBlank(area))).area), First(colMyPos).'Geographic area', First(colAreas)));
Set(varPanel, "");
Set(varNotice, "");
Set(varErr, "");
Set(varSel, Blank());
ClearCollect(colDetails, Details);
ClearCollect(colUnitOpts, {Name: "All units"}, ForAll(Filter(Units, 'Geographic area' = varArea), {Name: ThisRecord.Name}))
```

## Screen: scrTO

Screen **Fill**: `RGBA(15, 18, 22, 1)`

**OnVisible**

```
ClearCollect(colDetails, Details);
ClearCollect(colUnitOpts, {Name: "All units"}, ForAll(Filter(Units, 'Geographic area' = varArea), {Name: ThisRecord.Name}));
Set(varNotice, ""); Set(varPanel, ""); Set(varErr, "")
```

- **rctHeader** · Rectangle
  - position: X=0, Y=0, Width=Parent.Width, Height=64
  - Fill: `RGBA(23, 28, 34, 1)`
- **lblApp** · Label
  - position: X=16, Y=16, Width=240, Height=32
  - Text: `"Workforce Planner"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `18`
  - FontWeight: `FontWeight.Bold`
- **btnNavTO** · Button
  - position: X=270, Y=10, Width=190, Height=44
  - Text: `"Tables of Organization"`
  - Visible: `true`
  - OnSelect: `Navigate(scrTO, ScreenTransition.None)`
  - Fill: `RGBA(224, 164, 58, 1)`
  - Color: `RGBA(20, 17, 10, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavVac** · Button
  - position: X=468, Y=10, Width=170, Height=44
  - Text: `"Vacancies & Hiring"`
  - Visible: `true`
  - OnSelect: `Navigate(scrVac, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavAppr** · Button
  - position: X=646, Y=10, Width=170, Height=44
  - Text: `"Selection Approvals"`
  - Visible: `true`
  - OnSelect: `Navigate(scrAppr, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavRoles** · Button
  - position: X=824, Y=10, Width=160, Height=44
  - Text: `"Role Assignments"`
  - Visible: `varIsDA`
  - OnSelect: `Navigate(scrRoles, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **ddArea** · Dropdown
  - position: X=1000, Y=10, Width=230, Height=44
  - Items: `colAreas`
  - Value: `Name`
  - Default: `varArea.Name`
  - Visible: `varCanSeeAll`
  - **OnChange**:

    ```
    Set(varArea, Self.Selected); Set(varPanel, ""); ClearCollect(colUnitOpts, {Name: "All units"}, ForAll(Filter(Units, 'Geographic area' = varArea), {Name: ThisRecord.Name}))
    ```

- **lblAreaFixed** · Label
  - position: X=1000, Y=10, Width=230, Height=44
  - Text: `varArea.Name & " · your area"`
  - Visible: `!varCanSeeAll`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `14`
  - VerticalAlign: `VerticalAlign.Middle`
- **lblMe** · Label
  - position: X=1240, Y=10, Width=118, Height=44
  - Text: `varMe`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `12`
  - VerticalAlign: `VerticalAlign.Middle`
- **lblTOTitle** · Label
  - position: X=16, Y=76, Width=500, Height=40
  - Text: `"Tables of Organization"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `24`
  - FontWeight: `FontWeight.Bold`
- **ddUnit** · Dropdown
  - position: X=16, Y=124, Width=260, Height=44
  - Items: `colUnitOpts`
  - Value: `Name`
- **ddStatus** · Dropdown
  - position: X=288, Y=124, Width=180, Height=44
  - Items: `["All", "Filled", "Vacant"]`
  - Value: `Value`
- **txtSearch** · Text input
  - position: X=480, Y=124, Width=320, Height=44
  - HintText: `"Search position, title or incumbent"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
- **lblTONotice** · Label
  - position: X=812, Y=124, Width=540, Height=44
  - Text: `varNotice`
  - Color: `RGBA(224, 164, 58, 1)`
  - Size: `13`
  - VerticalAlign: `VerticalAlign.Middle`
- **galTO** · Gallery (Blank, vertical unless noted)
  - position: X=16, Y=180, Width=If(varPanel = "", Parent.Width - 32, 860), Height=Parent.Height - 196
  - TemplateSize: `96`
  - TemplatePadding: `6`
  - **Items**:

    ```
    SortByColumns(
        Filter(Positions,
            'Geographic area' = varArea,
            ddStatus.Selected.Value = "All" || 'Position status'.Value = ddStatus.Selected.Value,
            ddUnit.Selected.Name = "All units" || Unit.Name = ddUnit.Selected.Name,
            IsBlank(txtSearch.Text) || txtSearch.Text in 'Position ID' || txtSearch.Text in Title || txtSearch.Text in Incumbent),
        "wfp_name", SortOrder.Ascending)
    ```

  - Fill: `RGBA(15, 18, 22, 1)`
  - **rctTORow** · Rectangle (inside galTO)
    - position: X=0, Y=0, Width=Parent.TemplateWidth - 12, Height=Parent.TemplateHeight - 8
    - Fill: `RGBA(23, 28, 34, 1)`
    - BorderColor: `RGBA(56, 66, 78, 1)`
    - BorderThickness: `1`
  - **lblTOId** · Label (inside galTO)
    - position: X=12, Y=6, Width=520, Height=28
    - Text: `ThisItem.'Position ID' & " · " & ThisItem.Title`
    - Color: `RGBA(230, 233, 238, 1)`
    - Size: `15`
    - FontWeight: `FontWeight.Semibold`
  - **lblTOMeta** · Label (inside galTO)
    - position: X=12, Y=34, Width=520, Height=22
    - **Text**:

      ```
      ThisItem.'Pay plan'.Value & " · " & ThisItem.'Grade range' & " · " & ThisItem.'Employment type'.Value & If(ThisItem.'Position status'.Value = "Vacant", " · Funding: " & ThisItem.'Funding status'.Value, "")
      ```

    - Color: `RGBA(154, 164, 178, 1)`
    - Size: `12`
  - **lblTOInc** · Label (inside galTO)
    - position: X=12, Y=58, Width=360, Height=26
    - **Text**:

      ```
      If(ThisItem.'Position status'.Value = "Filled", ThisItem.Incumbent, "Vacant" & If(!IsBlank(ThisItem.'Previous incumbent'), " · was " & ThisItem.'Previous incumbent', ""))
      ```

    - **Color**:

      ```
      If(ThisItem.'Position status'.Value = "Filled", RGBA(230, 233, 238, 1), RGBA(224, 164, 58, 1))
      ```

    - Size: `14`
    - FontWeight: `FontWeight.Semibold`
  - **lblTODetail** · Label (inside galTO)
    - position: X=372, Y=58, Width=360, Height=26
    - Color: `RGBA(224, 164, 58, 1)`
    - Size: `12`
    - **Text**:

      ```
      With({out: LookUp(colDetails, 'Home position'.'Position ID' = ThisItem.'Position ID'), inn: Filter(colDetails, 'Detailed to'.'Position ID' = ThisItem.'Position ID')},
          If(!IsBlank(out), "On detail to " & out.'Detailed to'.'Position ID' & " (" & out.'Detailed to'.Title & ")", "") &
          If(!IsBlank(out) && !IsEmpty(inn), " · ", "") &
          If(!IsEmpty(inn), "Detailed in: " & Concat(inn, 'Home position'.Incumbent & " from " & 'Home position'.'Position ID', ", "), ""))
      ```

  - **btnTOEdit** · Button (inside galTO)
    - position: X=Parent.TemplateWidth - 330, Y=8, Width=150, Height=36
    - Text: `"Edit incumbent"`
    - Visible: `varCanEditInc`
    - **OnSelect**:

      ```
      Set(varSel, ThisItem); Set(varPanel, "inc"); Set(varErr, ""); Reset(txtIncName); Reset(txtIncEmail)
      ```

    - Fill: `RGBA(29, 37, 46, 1)`
    - Color: `RGBA(230, 233, 238, 1)`
    - BorderColor: `RGBA(56, 66, 78, 1)`
  - **btnTODetail** · Button (inside galTO)
    - position: X=Parent.TemplateWidth - 330, Y=50, Width=150, Height=36
    - Text: `"Detail someone in"`
    - Visible: `varCanDetail`
    - OnSelect: `Set(varSel, ThisItem); Set(varPanel, "detail"); Set(varErr, ""); Reset(ddDetailEmp)`
    - Fill: `RGBA(29, 37, 46, 1)`
    - Color: `RGBA(230, 233, 238, 1)`
    - BorderColor: `RGBA(56, 66, 78, 1)`
- **rctPanel** · Rectangle
  - position: X=892, Y=180, Width=458, Height=Parent.Height - 196
  - Fill: `RGBA(23, 28, 34, 1)`
  - BorderColor: `RGBA(224, 164, 58, 1)`
  - BorderThickness: `1`
  - Visible: `varPanel <> ""`
- **lblPanelTitle** · Label
  - position: X=908, Y=192, Width=430, Height=56
  - Visible: `varPanel <> ""`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `16`
  - FontWeight: `FontWeight.Bold`
  - **Text**:

    ```
    If(varPanel = "inc", "Edit incumbent · ", "Detail someone into ") & varSel.'Position ID' & " · " & varSel.Title
    ```

- **txtIncName** · Text input
  - position: X=908, Y=260, Width=426, Height=44
  - Visible: `varPanel = "inc"`
  - HintText: `"Incumbent name"`
  - Default: `varSel.Incumbent`
  - Color: `RGBA(230, 233, 238, 1)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
- **txtIncEmail** · Text input
  - position: X=908, Y=312, Width=426, Height=44
  - Visible: `varPanel = "inc"`
  - HintText: `"Incumbent sign-in email"`
  - Default: `varSel.'Incumbent email'`
  - Color: `RGBA(230, 233, 238, 1)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
- **btnIncSave** · Button
  - position: X=908, Y=368, Width=206, Height=44
  - Text: `"Set incumbent"`
  - Visible: `varPanel = "inc"`
  - Fill: `RGBA(224, 164, 58, 1)`
  - Color: `RGBA(20, 17, 10, 1)`
  - BorderColor: `RGBA(224, 164, 58, 1)`
  - **OnSelect**:

    ```
    If(IsBlank(txtIncName.Text),
        Set(varErr, "Enter the incumbent's name."),
        Patch(Positions, varSel, {Incumbent: txtIncName.Text, 'Incumbent email': Lower(txtIncEmail.Text), 'Position status': LookUp(colChPosStatus, Value = "Filled"), 'Previous incumbent': ""});
        Patch('Hiring Events', Defaults('Hiring Events'), {Summary: "Set incumbent of " & varSel.'Position ID' & " to " & txtIncName.Text, 'Event type': LookUp(colChEvent, Value = "Incumbent change"), 'Geographic area': varArea, By: varMe, Note: ""});
        Set(varNotice, "Incumbent updated for " & varSel.'Position ID' & ".");
        Set(varPanel, "");
        ClearCollect(colMyPos, Filter(Positions, 'Incumbent email' = varEmail)))
    ```

- **btnIncVacate** · Button
  - position: X=1126, Y=368, Width=208, Height=44
  - Text: `"Vacate position"`
  - Visible: `varPanel = "inc" && varSel.'Position status'.Value = "Filled"`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - **OnSelect**:

    ```
    Patch(Positions, varSel, {Incumbent: "", 'Incumbent email': "", 'Position status': LookUp(colChPosStatus, Value = "Vacant"), 'Previous incumbent': varSel.Incumbent});
    // a vacated home position drops its own details
    RemoveIf(Details, 'Home position'.'Position ID' = varSel.'Position ID');
    ClearCollect(colDetails, Details);
    Patch('Hiring Events', Defaults('Hiring Events'), {Summary: "Vacated " & varSel.'Position ID' & " (was " & varSel.Incumbent & ")", 'Event type': LookUp(colChEvent, Value = "Incumbent change"), 'Geographic area': varArea, By: varMe, Note: ""});
    Set(varNotice, varSel.'Position ID' & " is now vacant.");
    Set(varPanel, "")
    ```

- **lblDetailHelp** · Label
  - position: X=908, Y=250, Width=426, Height=44
  - Visible: `varPanel = "detail"`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `12`
  - Text: `"Choose the employee by their home position. The home position keeps its incumbent."`
- **ddDetailEmp** · Dropdown
  - position: X=908, Y=298, Width=426, Height=44
  - Visible: `varPanel = "detail"`
  - Value: `lbl`
  - **Items**:

    ```
    AddColumns(Filter(Positions, 'Geographic area' = varArea, 'Position status'.Value = "Filled", 'Position ID' <> varSel.'Position ID'), lbl, 'Position ID' & " · " & Incumbent)
    ```

- **btnDetailSave** · Button
  - position: X=908, Y=352, Width=206, Height=44
  - Text: `"Detail in"`
  - Visible: `varPanel = "detail"`
  - Fill: `RGBA(224, 164, 58, 1)`
  - Color: `RGBA(20, 17, 10, 1)`
  - BorderColor: `RGBA(224, 164, 58, 1)`
  - **OnSelect**:

    ```
    If(!IsBlank(LookUp(colDetails, 'Home position'.'Position ID' = ddDetailEmp.Selected.'Position ID')),
        Set(varErr, ddDetailEmp.Selected.Incumbent & " is already detailed. Remove that detail first."),
        Patch(Details, Defaults(Details), {'Detail ID': "DT-" & Text(Now(), "yymmdd-hhmmss"), 'Home position': ddDetailEmp.Selected, 'Detailed to': varSel, 'Geographic area': varArea, 'Entered by': varMe});
        ClearCollect(colDetails, Details);
        Patch('Hiring Events', Defaults('Hiring Events'), {Summary: "Detailed " & ddDetailEmp.Selected.Incumbent & " (" & ddDetailEmp.Selected.'Position ID' & ") to " & varSel.'Position ID', 'Event type': LookUp(colChEvent, Value = "Detail"), 'Geographic area': varArea, By: varMe, Note: ""});
        Set(varErr, "");
        Set(varNotice, ddDetailEmp.Selected.Incumbent & " is detailed to " & varSel.'Position ID' & ". " & ddDetailEmp.Selected.'Position ID' & " still shows them as its incumbent."))
    ```

- **lblDetailsHere** · Label
  - position: X=908, Y=410, Width=426, Height=26
  - Visible: `varPanel = "detail"`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `12`
  - Text: `"Currently detailed into this position"`
- **galDetailsHere** · Gallery (Blank, vertical unless noted)
  - position: X=908, Y=438, Width=426, Height=170
  - TemplateSize: `48`
  - TemplatePadding: `2`
  - Visible: `varPanel = "detail"`
  - Items: `Filter(colDetails, 'Detailed to'.'Position ID' = varSel.'Position ID')`
  - Fill: `RGBA(23, 28, 34, 1)`
  - **lblDetailName** · Label (inside galDetailsHere)
    - position: X=4, Y=4, Width=290, Height=40
    - Color: `RGBA(230, 233, 238, 1)`
    - Size: `13`
    - Text: `ThisItem.'Home position'.Incumbent & " from " & ThisItem.'Home position'.'Position ID'`
  - **btnDetailRemove** · Button (inside galDetailsHere)
    - position: X=300, Y=4, Width=110, Height=40
    - Text: `"Remove"`
    - Fill: `RGBA(29, 37, 46, 1)`
    - Color: `RGBA(230, 233, 238, 1)`
    - BorderColor: `RGBA(56, 66, 78, 1)`
    - **OnSelect**:

      ```
      Remove(Details, LookUp(Details, 'Detail ID' = ThisItem.'Detail ID'));
      ClearCollect(colDetails, Details);
      Set(varNotice, "Removed the detail from " & ThisItem.'Home position'.'Position ID' & ".")
      ```

- **lblPanelErr** · Label
  - position: X=908, Y=Parent.Height - 120, Width=426, Height=44
  - Visible: `varPanel <> ""`
  - Color: `RGBA(244, 165, 138, 1)`
  - Size: `13`
  - Text: `varErr`
- **btnPanelClose** · Button
  - position: X=908, Y=Parent.Height - 68, Width=426, Height=44
  - Text: `"Close"`
  - Visible: `varPanel <> ""`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - OnSelect: `Set(varPanel, ""); Set(varErr, "")`
## Screen: scrVac

Screen **Fill**: `RGBA(15, 18, 22, 1)`

**OnVisible**

```
Set(varNotice, ""); Set(varPanel, ""); Set(varErr, "")
```

- **rctHeader** · Rectangle
  - position: X=0, Y=0, Width=Parent.Width, Height=64
  - Fill: `RGBA(23, 28, 34, 1)`
- **lblApp** · Label
  - position: X=16, Y=16, Width=240, Height=32
  - Text: `"Workforce Planner"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `18`
  - FontWeight: `FontWeight.Bold`
- **btnNavTO** · Button
  - position: X=270, Y=10, Width=190, Height=44
  - Text: `"Tables of Organization"`
  - Visible: `true`
  - OnSelect: `Navigate(scrTO, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavVac** · Button
  - position: X=468, Y=10, Width=170, Height=44
  - Text: `"Vacancies & Hiring"`
  - Visible: `true`
  - OnSelect: `Navigate(scrVac, ScreenTransition.None)`
  - Fill: `RGBA(224, 164, 58, 1)`
  - Color: `RGBA(20, 17, 10, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavAppr** · Button
  - position: X=646, Y=10, Width=170, Height=44
  - Text: `"Selection Approvals"`
  - Visible: `true`
  - OnSelect: `Navigate(scrAppr, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavRoles** · Button
  - position: X=824, Y=10, Width=160, Height=44
  - Text: `"Role Assignments"`
  - Visible: `varIsDA`
  - OnSelect: `Navigate(scrRoles, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **ddArea** · Dropdown
  - position: X=1000, Y=10, Width=230, Height=44
  - Items: `colAreas`
  - Value: `Name`
  - Default: `varArea.Name`
  - Visible: `varCanSeeAll`
  - **OnChange**:

    ```
    Set(varArea, Self.Selected); Set(varPanel, ""); ClearCollect(colUnitOpts, {Name: "All units"}, ForAll(Filter(Units, 'Geographic area' = varArea), {Name: ThisRecord.Name}))
    ```

- **lblAreaFixed** · Label
  - position: X=1000, Y=10, Width=230, Height=44
  - Text: `varArea.Name & " · your area"`
  - Visible: `!varCanSeeAll`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `14`
  - VerticalAlign: `VerticalAlign.Middle`
- **lblMe** · Label
  - position: X=1240, Y=10, Width=118, Height=44
  - Text: `varMe`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `12`
  - VerticalAlign: `VerticalAlign.Middle`
- **lblVacTitle** · Label
  - position: X=16, Y=76, Width=600, Height=40
  - Text: `"Vacancies & Hiring"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `24`
  - FontWeight: `FontWeight.Bold`
- **lblVacNotice** · Label
  - position: X=640, Y=76, Width=712, Height=40
  - Text: `varNotice`
  - Color: `RGBA(224, 164, 58, 1)`
  - Size: `13`
  - VerticalAlign: `VerticalAlign.Middle`
- **galVac** · Gallery (Blank, vertical unless noted)
  - position: X=16, Y=124, Width=If(varPanel = "", Parent.Width - 32, 860), Height=Parent.Height - 140
  - TemplateSize: `128`
  - TemplatePadding: `6`
  - **Items**:

    ```
    SortByColumns(Filter('Hiring Actions', 'Geographic area' = varArea), "wfp_name", SortOrder.Ascending)
    ```

  - Fill: `RGBA(15, 18, 22, 1)`
  - **rctVacRow** · Rectangle (inside galVac)
    - position: X=0, Y=0, Width=Parent.TemplateWidth - 12, Height=Parent.TemplateHeight - 8
    - Fill: `RGBA(23, 28, 34, 1)`
    - BorderColor: `RGBA(56, 66, 78, 1)`
    - BorderThickness: `1`
  - **lblVacId** · Label (inside galVac)
    - position: X=12, Y=6, Width=560, Height=28
    - Color: `RGBA(230, 233, 238, 1)`
    - Size: `15`
    - FontWeight: `FontWeight.Semibold`
    - **Text**:

      ```
      ThisItem.'Action ID' & " · " & ThisItem.Position.'Position ID' & " · " & ThisItem.Position.Title
      ```

  - **lblVacMeta** · Label (inside galVac)
    - position: X=12, Y=36, Width=560, Height=22
    - Color: `RGBA(154, 164, 178, 1)`
    - Size: `12`
    - **Text**:

      ```
      ThisItem.Position.'Pay plan'.Value & " · " & ThisItem.Position.'Grade range' & " · " & ThisItem.Position.'Employment type'.Value & If(!IsBlank(ThisItem.Position.'Previous incumbent'), " · was " & ThisItem.Position.'Previous incumbent', "")
      ```

  - **lblVacStage** · Label (inside galVac)
    - position: X=12, Y=62, Width=560, Height=26
    - Color: `RGBA(224, 164, 58, 1)`
    - Size: `13`
    - FontWeight: `FontWeight.Semibold`
    - **Text**:

      ```
      "Stage: " & ThisItem.Stage.Value & If(!IsBlank(ThisItem.'Selected candidate'), " · Selected: " & ThisItem.'Selected candidate' & " (" & ThisItem.'Proposed grade and step' & ")", "") & If(!IsBlank(ThisItem.'Entry on duty'), " · Fills " & Text(ThisItem.'Entry on duty', "mmm d"), "")
      ```

  - **ddVacStage** · Dropdown (inside galVac)
    - position: X=12, Y=88, Width=240, Height=34
    - Items: `["Cleared to advertise", "Announced", "Certificate issued", "Interviews"]`
    - Value: `Value`
    - Default: `ThisItem.Stage.Value`
    - **Visible**:

      ```
      varCanEditHiring && ThisItem.Stage.Value in ["Cleared to advertise", "Announced", "Certificate issued", "Interviews"]
      ```

    - **OnChange**:

      ```
      Patch('Hiring Actions', ThisItem, {Stage: LookUp(colChStage, Value = Self.Selected.Value)});
      Patch('Hiring Events', Defaults('Hiring Events'), {Summary: ThisItem.'Action ID' & " moved to " & Self.Selected.Value, 'Event type': LookUp(colChEvent, Value = "Stage change"), 'Geographic area': varArea, By: varMe, Note: ""});
      Set(varNotice, ThisItem.'Action ID' & " moved to " & Self.Selected.Value & ".")
      ```

  - **btnVacSubmit** · Button (inside galVac)
    - position: X=264, Y=88, Width=190, Height=34
    - Text: `"Submit selection"`
    - Visible: `varCanEditHiring && ThisItem.Stage.Value = "Interviews"`
    - Fill: `RGBA(224, 164, 58, 1)`
    - Color: `RGBA(20, 17, 10, 1)`
    - BorderColor: `RGBA(224, 164, 58, 1)`
    - **OnSelect**:

      ```
      Set(varSel, ThisItem); Set(varPanel, "sel"); Set(varErr, ""); Reset(txtSelCand); Reset(txtSelGrade)
      ```

  - **ddVacFund** · Dropdown (inside galVac)
    - position: X=Parent.TemplateWidth - 280, Y=8, Width=190, Height=34
    - Items: `["Approved", "Pending", "Not approved"]`
    - Value: `Value`
    - Default: `ThisItem.Position.'Funding status'.Value`
    - Visible: `varCanFund && ThisItem.Position.'Position status'.Value = "Vacant"`
    - **OnChange**:

      ```
      Patch(Positions, ThisItem.Position, {'Funding status': LookUp(colChFunding, Value = Self.Selected.Value)});
      Set(varNotice, "Funding for " & ThisItem.Position.'Position ID' & " set to " & Self.Selected.Value & ".")
      ```

  - **dpVacEod** · Date picker (inside galVac)
    - position: X=Parent.TemplateWidth - 280, Y=50, Width=170, Height=34
    - Visible: `varCanEditHiring && ThisItem.Stage.Value = "Offer"`
    - DefaultDate: `ThisItem.'Entry on duty'`
  - **btnVacEod** · Button (inside galVac)
    - position: X=Parent.TemplateWidth - 280, Y=88, Width=190, Height=34
    - Text: `"Set entry on duty"`
    - Visible: `varCanEditHiring && ThisItem.Stage.Value = "Offer"`
    - Fill: `RGBA(29, 37, 46, 1)`
    - Color: `RGBA(230, 233, 238, 1)`
    - BorderColor: `RGBA(56, 66, 78, 1)`
    - **OnSelect**:

      ```
      If(IsBlank(dpVacEod.SelectedDate),
          Set(varNotice, "Choose an entry on duty date."),
          Patch('Hiring Actions', ThisItem, {'Entry on duty': dpVacEod.SelectedDate});
          If(dpVacEod.SelectedDate <= Today(),
              Patch(Positions, ThisItem.Position, {Incumbent: ThisItem.'Selected candidate', 'Position status': LookUp(colChPosStatus, Value = "Filled"), 'Previous incumbent': ""});
              Set(varNotice, ThisItem.Position.'Position ID' & " is filled by " & ThisItem.'Selected candidate' & "."),
              Set(varNotice, "Entry on duty set. The daily fill flow puts " & ThisItem.'Selected candidate' & " into the position on that date.")))
      ```

- **rctSelPanel** · Rectangle
  - position: X=892, Y=124, Width=458, Height=330
  - Fill: `RGBA(23, 28, 34, 1)`
  - BorderColor: `RGBA(224, 164, 58, 1)`
  - BorderThickness: `1`
  - Visible: `varPanel = "sel"`
- **lblSelTitle** · Label
  - position: X=908, Y=136, Width=426, Height=52
  - Visible: `varPanel = "sel"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `16`
  - FontWeight: `FontWeight.Bold`
  - Text: `"Submit selection · " & varSel.'Action ID' & " · " & varSel.Position.Title`
- **txtSelCand** · Text input
  - position: X=908, Y=196, Width=426, Height=44
  - Visible: `varPanel = "sel"`
  - HintText: `"Selected candidate"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
- **txtSelGrade** · Text input
  - position: X=908, Y=248, Width=426, Height=44
  - Visible: `varPanel = "sel"`
  - HintText: `"Proposed grade and step, for example GS-12 Step 3"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
- **lblSelRoute** · Label
  - position: X=908, Y=298, Width=426, Height=44
  - Visible: `varPanel = "sel"`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `12`
  - **Text**:

    ```
    With({m: Match(Upper(txtSelGrade.Text), "(?<plan>GS|GW|WG)\s*-?\s*(?<g>\d{1,2})")},
        "Final approval routes to: " & If(
            Coalesce(Value(m.g), varSel.Position.'Full performance grade') >= 10, "Area fire chief or deputy chief",
            Coalesce(m.plan, varSel.Position.'Pay plan'.Value) = "GW", "Assistant Chief, Operations",
            "Assistant Chief, Support Services"))
    ```

- **btnSelSubmit** · Button
  - position: X=908, Y=350, Width=206, Height=44
  - Text: `"Submit for approval"`
  - Visible: `varPanel = "sel"`
  - Fill: `RGBA(224, 164, 58, 1)`
  - Color: `RGBA(20, 17, 10, 1)`
  - BorderColor: `RGBA(224, 164, 58, 1)`
  - **OnSelect**:

    ```
    If(IsBlank(txtSelCand.Text) || IsBlank(txtSelGrade.Text),
        Set(varErr, "Add the selected candidate and the proposed grade and step."),
        With({m: Match(Upper(txtSelGrade.Text), "(?<plan>GS|GW|WG)\s*-?\s*(?<g>\d{1,2})")},
            With({vG: Coalesce(Value(m.g), varSel.Position.'Full performance grade'), vPlan: Coalesce(m.plan, varSel.Position.'Pay plan'.Value),
                  vRound: CountRows(Filter('Selection Approval Steps', 'Hiring action'.'Action ID' = varSel.'Action ID', Sequence = 1)) + 1,
                  vSupEmail: LookUp(Positions, 'Position ID' = varSel.Position.'Position ID').'Supervisor position'.'Incumbent email'},
                With({vGroup: If(vG >= 10, "Area chief or deputy", If(vPlan = "GW", "Assistant Chief Operations", "Assistant Chief Support Services"))},
                    Patch('Hiring Actions', varSel, {Stage: LookUp(colChStage, Value = "Selection approval"), 'Selected candidate': txtSelCand.Text, 'Proposed grade and step': Upper(txtSelGrade.Text)});
                    Collect('Selection Approval Steps',
                        {Step: varSel.'Action ID' & " r" & vRound & " step 1", 'Hiring action': varSel, 'Geographic area': varArea, Sequence: 1, 'Approval round': vRound, 'Approver group': LookUp(colChApprover, Value = "Supervisor"), Decision: LookUp(colChDecision, Value = "Pending"), 'Supervisor email': vSupEmail, Position: varSel.Position.'Position ID' & " " & varSel.Position.Title},
                        {Step: varSel.'Action ID' & " r" & vRound & " step 2", 'Hiring action': varSel, 'Geographic area': varArea, Sequence: 2, 'Approval round': vRound, 'Approver group': LookUp(colChApprover, Value = "Budget"), Decision: LookUp(colChDecision, Value = "Waiting"), Position: varSel.Position.'Position ID' & " " & varSel.Position.Title},
                        {Step: varSel.'Action ID' & " r" & vRound & " step 3", 'Hiring action': varSel, 'Geographic area': varArea, Sequence: 3, 'Approval round': vRound, 'Approver group': LookUp(colChApprover, Value = vGroup), Decision: LookUp(colChDecision, Value = "Waiting"), Position: varSel.Position.'Position ID' & " " & varSel.Position.Title});
                    Patch('Hiring Events', Defaults('Hiring Events'), {Summary: "Submitted selection for " & varSel.'Action ID' & " (" & txtSelCand.Text & ", " & Upper(txtSelGrade.Text) & "), final approver " & vGroup, 'Event type': LookUp(colChEvent, Value = "Selection routed"), 'Geographic area': varArea, By: varMe, Note: ""});
                    Set(varNotice, "Submitted. Final approval routes to " & vGroup & ".");
                    Set(varPanel, "")))))
    ```

- **lblSelErr** · Label
  - position: X=908, Y=398, Width=426, Height=24
  - Visible: `varPanel = "sel"`
  - Color: `RGBA(244, 165, 138, 1)`
  - Size: `13`
  - Text: `varErr`
- **btnSelClose** · Button
  - position: X=1126, Y=350, Width=208, Height=44
  - Text: `"Cancel"`
  - Visible: `varPanel = "sel"`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - OnSelect: `Set(varPanel, ""); Set(varErr, "")`
## Screen: scrAppr

Screen **Fill**: `RGBA(15, 18, 22, 1)`

**OnVisible**

```
Set(varNotice, "")
```

- **rctHeader** · Rectangle
  - position: X=0, Y=0, Width=Parent.Width, Height=64
  - Fill: `RGBA(23, 28, 34, 1)`
- **lblApp** · Label
  - position: X=16, Y=16, Width=240, Height=32
  - Text: `"Workforce Planner"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `18`
  - FontWeight: `FontWeight.Bold`
- **btnNavTO** · Button
  - position: X=270, Y=10, Width=190, Height=44
  - Text: `"Tables of Organization"`
  - Visible: `true`
  - OnSelect: `Navigate(scrTO, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavVac** · Button
  - position: X=468, Y=10, Width=170, Height=44
  - Text: `"Vacancies & Hiring"`
  - Visible: `true`
  - OnSelect: `Navigate(scrVac, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavAppr** · Button
  - position: X=646, Y=10, Width=170, Height=44
  - Text: `"Selection Approvals"`
  - Visible: `true`
  - OnSelect: `Navigate(scrAppr, ScreenTransition.None)`
  - Fill: `RGBA(224, 164, 58, 1)`
  - Color: `RGBA(20, 17, 10, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavRoles** · Button
  - position: X=824, Y=10, Width=160, Height=44
  - Text: `"Role Assignments"`
  - Visible: `varIsDA`
  - OnSelect: `Navigate(scrRoles, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **ddArea** · Dropdown
  - position: X=1000, Y=10, Width=230, Height=44
  - Items: `colAreas`
  - Value: `Name`
  - Default: `varArea.Name`
  - Visible: `varCanSeeAll`
  - **OnChange**:

    ```
    Set(varArea, Self.Selected); Set(varPanel, ""); ClearCollect(colUnitOpts, {Name: "All units"}, ForAll(Filter(Units, 'Geographic area' = varArea), {Name: ThisRecord.Name}))
    ```

- **lblAreaFixed** · Label
  - position: X=1000, Y=10, Width=230, Height=44
  - Text: `varArea.Name & " · your area"`
  - Visible: `!varCanSeeAll`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `14`
  - VerticalAlign: `VerticalAlign.Middle`
- **lblMe** · Label
  - position: X=1240, Y=10, Width=118, Height=44
  - Text: `varMe`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `12`
  - VerticalAlign: `VerticalAlign.Middle`
- **lblApprTitle** · Label
  - position: X=16, Y=76, Width=600, Height=40
  - Text: `"Selection Approvals"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `24`
  - FontWeight: `FontWeight.Bold`
- **lblApprHelp** · Label
  - position: X=16, Y=116, Width=1334, Height=30
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `12`
  - **Text**:

    ```
    "Steps: Supervisor, Budget, then the final approver. GW below 10: Assistant Chief, Operations. GS or WG below 10: Assistant Chief, Support Services. Grade 10 and above: area fire chief or deputy chief."
    ```

- **lblApprNotice** · Label
  - position: X=640, Y=76, Width=712, Height=40
  - Text: `varNotice`
  - Color: `RGBA(224, 164, 58, 1)`
  - Size: `13`
  - VerticalAlign: `VerticalAlign.Middle`
- **txtApprComment** · Text input
  - position: X=16, Y=150, Width=1334, Height=44
  - HintText: `"Comment (required when returning a selection)"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
- **galAppr** · Gallery (Blank, vertical unless noted)
  - position: X=16, Y=204, Width=Parent.Width - 32, Height=Parent.Height - 220
  - TemplateSize: `250`
  - TemplatePadding: `8`
  - Items: `Filter('Hiring Actions', 'Geographic area' = varArea, Stage.Value = "Selection approval")`
  - Fill: `RGBA(15, 18, 22, 1)`
  - **rctApprRow** · Rectangle (inside galAppr)
    - position: X=0, Y=0, Width=Parent.TemplateWidth - 12, Height=Parent.TemplateHeight - 8
    - Fill: `RGBA(23, 28, 34, 1)`
    - BorderColor: `RGBA(56, 66, 78, 1)`
    - BorderThickness: `1`
  - **lblApprId** · Label (inside galAppr)
    - position: X=12, Y=6, Width=900, Height=28
    - Color: `RGBA(230, 233, 238, 1)`
    - Size: `15`
    - FontWeight: `FontWeight.Semibold`
    - **Text**:

      ```
      ThisItem.'Action ID' & " · " & ThisItem.Position.'Position ID' & " · " & ThisItem.Position.Title
      ```

  - **lblApprSel** · Label (inside galAppr)
    - position: X=12, Y=36, Width=900, Height=24
    - Color: `RGBA(154, 164, 178, 1)`
    - Size: `13`
    - **Text**:

      ```
      "Selected: " & ThisItem.'Selected candidate' & " · Proposed " & ThisItem.'Proposed grade and step'
      ```

  - **galSteps** · Gallery (Blank, vertical unless noted) (inside galAppr)
    - position: X=12, Y=66, Width=Parent.TemplateWidth - 36, Height=168
    - TemplateSize: `420`
    - TemplatePadding: `6`
    - Layout: `Horizontal`
    - **Items**:

      ```
      SortByColumns(Filter('Selection Approval Steps', 'Hiring action'.'Action ID' = ThisItem.'Action ID', 'Approval round' = Max(Filter('Selection Approval Steps', 'Hiring action'.'Action ID' = ThisItem.'Action ID'), 'Approval round')), "wfp_sequence", SortOrder.Ascending)
      ```

    - Fill: `RGBA(23, 28, 34, 1)`
## Screen: scrRoles

Screen **Fill**: `RGBA(15, 18, 22, 1)`

**OnVisible**

```
Set(varNotice, ""); Set(varPanel, ""); Set(varErr, "")
```

- **rctHeader** · Rectangle
  - position: X=0, Y=0, Width=Parent.Width, Height=64
  - Fill: `RGBA(23, 28, 34, 1)`
- **lblApp** · Label
  - position: X=16, Y=16, Width=240, Height=32
  - Text: `"Workforce Planner"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `18`
  - FontWeight: `FontWeight.Bold`
- **btnNavTO** · Button
  - position: X=270, Y=10, Width=190, Height=44
  - Text: `"Tables of Organization"`
  - Visible: `true`
  - OnSelect: `Navigate(scrTO, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavVac** · Button
  - position: X=468, Y=10, Width=170, Height=44
  - Text: `"Vacancies & Hiring"`
  - Visible: `true`
  - OnSelect: `Navigate(scrVac, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavAppr** · Button
  - position: X=646, Y=10, Width=170, Height=44
  - Text: `"Selection Approvals"`
  - Visible: `true`
  - OnSelect: `Navigate(scrAppr, ScreenTransition.None)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **btnNavRoles** · Button
  - position: X=824, Y=10, Width=160, Height=44
  - Text: `"Role Assignments"`
  - Visible: `varIsDA`
  - OnSelect: `Navigate(scrRoles, ScreenTransition.None)`
  - Fill: `RGBA(224, 164, 58, 1)`
  - Color: `RGBA(20, 17, 10, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - RadiusTopLeft: `8`
  - RadiusTopRight: `8`
  - RadiusBottomLeft: `8`
  - RadiusBottomRight: `8`
- **ddArea** · Dropdown
  - position: X=1000, Y=10, Width=230, Height=44
  - Items: `colAreas`
  - Value: `Name`
  - Default: `varArea.Name`
  - Visible: `varCanSeeAll`
  - **OnChange**:

    ```
    Set(varArea, Self.Selected); Set(varPanel, ""); ClearCollect(colUnitOpts, {Name: "All units"}, ForAll(Filter(Units, 'Geographic area' = varArea), {Name: ThisRecord.Name}))
    ```

- **lblAreaFixed** · Label
  - position: X=1000, Y=10, Width=230, Height=44
  - Text: `varArea.Name & " · your area"`
  - Visible: `!varCanSeeAll`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `14`
  - VerticalAlign: `VerticalAlign.Middle`
- **lblMe** · Label
  - position: X=1240, Y=10, Width=118, Height=44
  - Text: `varMe`
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `12`
  - VerticalAlign: `VerticalAlign.Middle`
- **lblRoleTitle** · Label
  - position: X=16, Y=76, Width=500, Height=40
  - Text: `"Role Assignments"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `24`
  - FontWeight: `FontWeight.Bold`
- **lblRoleHelp** · Label
  - position: X=16, Y=114, Width=900, Height=40
  - Color: `RGBA(154, 164, 178, 1)`
  - Size: `12`
  - **Text**:

    ```
    If(varIsDAAll, "You assign roles in any area and can appoint data administrators for one area or all areas.", "You assign roles for " & varArea.Name & " only.") & " Supervisors come from the position hierarchy and are not assigned here."
    ```

- **lblRoleNotice** · Label
  - position: X=640, Y=76, Width=712, Height=40
  - Text: `varNotice`
  - Color: `RGBA(224, 164, 58, 1)`
  - Size: `13`
  - VerticalAlign: `VerticalAlign.Middle`
- **txtRoleSearch** · Text input
  - position: X=16, Y=160, Width=420, Height=44
  - HintText: `"Search by name or role"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
- **tglEnded** · Toggle
  - position: X=450, Y=160, Width=190, Height=44
  - Default: `false`
  - TrueText: `"Show ended"`
  - FalseText: `"Active only"`
  - Color: `RGBA(230, 233, 238, 1)`
- **btnRoleAdd** · Button
  - position: X=1150, Y=160, Width=200, Height=44
  - Text: `"Assign a role"`
  - Fill: `RGBA(224, 164, 58, 1)`
  - Color: `RGBA(20, 17, 10, 1)`
  - BorderColor: `RGBA(224, 164, 58, 1)`
  - OnSelect: `Set(varPanel, "role"); Set(varErr, ""); Reset(txtRName); Reset(txtREmail); Reset(ddRRole)`
- **galRoles** · Gallery (Blank, vertical unless noted)
  - position: X=16, Y=214, Width=If(varPanel = "", Parent.Width - 32, 860), Height=Parent.Height - 230
  - TemplateSize: `72`
  - TemplatePadding: `6`
  - **Items**:

    ```
    SortByColumns(Filter('Role Assignments',
        'Geographic area' = varArea || (varIsDAAll && 'All areas'),
        tglEnded.Value || 'Assignment status'.Value = "Active",
        IsBlank(txtRoleSearch.Text) || txtRoleSearch.Text in 'Person' || txtRoleSearch.Text in Role.Value), "wfp_name", SortOrder.Ascending)
    ```

  - Fill: `RGBA(15, 18, 22, 1)`
  - **rctRoleRow** · Rectangle (inside galRoles)
    - position: X=0, Y=0, Width=Parent.TemplateWidth - 12, Height=Parent.TemplateHeight - 8
    - Fill: `RGBA(23, 28, 34, 1)`
    - BorderColor: `RGBA(56, 66, 78, 1)`
    - BorderThickness: `1`
  - **lblRoleName** · Label (inside galRoles)
    - position: X=12, Y=6, Width=420, Height=26
    - Color: `RGBA(230, 233, 238, 1)`
    - Size: `15`
    - FontWeight: `FontWeight.Semibold`
    - Text: `ThisItem.Person & " · " & ThisItem.Role.Value`
  - **lblRoleMeta** · Label (inside galRoles)
    - position: X=12, Y=34, Width=520, Height=22
    - Color: `RGBA(154, 164, 178, 1)`
    - Size: `12`
    - **Text**:

      ```
      If(ThisItem.'All areas', "All areas", ThisItem.'Geographic area'.Name) & " · " & ThisItem.'User email' & " · " & ThisItem.'Assignment status'.Value & " · since " & Text(ThisItem.'Start date', "mmm d, yyyy")
      ```

  - **lblRoleSees** · Label (inside galRoles)
    - position: X=540, Y=34, Width=200, Height=22
    - Color: `RGBA(224, 164, 58, 1)`
    - Size: `12`
    - **Text**:

      ```
      If(ThisItem.Role.Value in ["Area fire chief", "Deputy chief", "Assistant Chief Operations", "Assistant Chief Support Services"], "All areas, view", If(ThisItem.'All areas', "All areas, administer", "Own area only"))
      ```

  - **btnRoleEnd** · Button (inside galRoles)
    - position: X=Parent.TemplateWidth - 140, Y=14, Width=110, Height=40
    - Text: `"End"`
    - Visible: `ThisItem.'Assignment status'.Value = "Active"`
    - Fill: `RGBA(29, 37, 46, 1)`
    - Color: `RGBA(230, 233, 238, 1)`
    - BorderColor: `RGBA(56, 66, 78, 1)`
    - **OnSelect**:

      ```
      Patch('Role Assignments', ThisItem, {'Assignment status': LookUp(colChAssign, Value = "Ended")});
      Patch('Hiring Events', Defaults('Hiring Events'), {Summary: "Ended " & ThisItem.Role.Value & " for " & ThisItem.Person, 'Event type': LookUp(colChEvent, Value = "Role assigned"), 'Geographic area': varArea, By: varMe, Note: ""});
      Set(varNotice, "Ended " & ThisItem.Person & "'s " & ThisItem.Role.Value & " assignment.")
      ```

- **rctRolePanel** · Rectangle
  - position: X=892, Y=214, Width=458, Height=360
  - Fill: `RGBA(23, 28, 34, 1)`
  - BorderColor: `RGBA(224, 164, 58, 1)`
  - BorderThickness: `1`
  - Visible: `varPanel = "role"`
- **lblRolePanelTitle** · Label
  - position: X=908, Y=226, Width=426, Height=32
  - Visible: `varPanel = "role"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Size: `16`
  - FontWeight: `FontWeight.Bold`
  - Text: `"Assign a role"`
- **txtRName** · Text input
  - position: X=908, Y=266, Width=426, Height=44
  - Visible: `varPanel = "role"`
  - HintText: `"Person's name"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
- **txtREmail** · Text input
  - position: X=908, Y=318, Width=426, Height=44
  - Visible: `varPanel = "role"`
  - HintText: `"Sign-in email"`
  - Color: `RGBA(230, 233, 238, 1)`
  - Fill: `RGBA(29, 37, 46, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
- **ddRRole** · Dropdown
  - position: X=908, Y=370, Width=426, Height=44
  - Visible: `varPanel = "role"`
  - Items: `colChRole`
  - Value: `Value`
- **ddRArea** · Dropdown
  - position: X=908, Y=422, Width=426, Height=44
  - Visible: `varPanel = "role" && varIsDAAll`
  - Value: `Name`
  - **Items**:

    ```
    If(ddRRole.Selected.Value = "Data administrator", Ungroup(Table({t: Table({Name: "All areas"})}, {t: ShowColumns(colAreas, "Name")}), t), ShowColumns(colAreas, "Name"))
    ```

- **btnRoleSave** · Button
  - position: X=908, Y=476, Width=206, Height=44
  - Text: `"Save assignment"`
  - Visible: `varPanel = "role"`
  - Fill: `RGBA(224, 164, 58, 1)`
  - Color: `RGBA(20, 17, 10, 1)`
  - BorderColor: `RGBA(224, 164, 58, 1)`
  - **OnSelect**:

    ```
    With({vAll: varIsDAAll && ddRArea.Selected.Name = "All areas", vAreaRec: If(varIsDAAll, LookUp(colAreas, Name = ddRArea.Selected.Name), varArea)},
        If(IsBlank(txtRName.Text) || IsBlank(txtREmail.Text),
            Set(varErr, "Enter the person's name and sign-in email."),
            !vAll && IsBlank(vAreaRec),
            Set(varErr, "Choose a geographic area."),
            !vAll && ddRRole.Selected.Value in ["Area fire chief", "Assistant Chief Support Services", "Data administrator"] && !IsBlank(LookUp('Role Assignments', 'Assignment status'.Value = "Active" && Role.Value = ddRRole.Selected.Value && 'Geographic area'.Code = vAreaRec.Code)),
            Set(varErr, "That role is already held in the area. End that assignment first."),
            Patch('Role Assignments', Defaults('Role Assignments'), {Person: txtRName.Text, 'User email': Lower(txtREmail.Text), Role: LookUp(colChRole, Value = ddRRole.Selected.Value), 'Assignment status': LookUp(colChAssign, Value = "Active"), 'All areas': vAll, 'Geographic area': If(vAll, Blank(), vAreaRec), 'Start date': Today()});
            Patch('Hiring Events', Defaults('Hiring Events'), {Summary: "Assigned " & ddRRole.Selected.Value & " to " & txtRName.Text, 'Event type': LookUp(colChEvent, Value = "Role assigned"), 'Geographic area': varArea, By: varMe, Note: ""});
            Set(varNotice, txtRName.Text & " is now " & ddRRole.Selected.Value & ".");
            Set(varPanel, "")))
    ```

- **btnRoleClose** · Button
  - position: X=1126, Y=476, Width=208, Height=44
  - Text: `"Cancel"`
  - Visible: `varPanel = "role"`
  - Fill: `RGBA(29, 37, 46, 1)`
  - Color: `RGBA(230, 233, 238, 1)`
  - BorderColor: `RGBA(56, 66, 78, 1)`
  - OnSelect: `Set(varPanel, ""); Set(varErr, "")`
- **lblRoleErr** · Label
  - position: X=908, Y=528, Width=426, Height=36
  - Visible: `varPanel = "role"`
  - Color: `RGBA(244, 165, 138, 1)`
  - Size: `13`
  - Text: `varErr`
