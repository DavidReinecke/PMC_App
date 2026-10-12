import os, shutil, uuid
from xml.sax.saxutils import escape
from schema import TABLES, BASE
SUBSET = os.environ.get('SUBSET')
if SUBSET: TABLES = [t for t in TABLES if t['name'] in SUBSET.split(',')]
SOLNAME = os.environ.get('SOLNAME', 'WorkforcePlanner')
SOLDISP = os.environ.get('SOLDISP', 'Workforce Planner')

OUT = os.environ.get('OUT', '../WorkforcePlanner_solution')
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT + '/Other'); os.makedirs(OUT + '/Entities')

def lbl(tag, d): return '<%s description="%s" languagecode="1033" />' % (tag, escape(d, {'"': '&quot;'}))
def names(d): return '<displaynames>' + lbl('displayname', d) + '</displaynames>'
def descs(d): return '<Descriptions>' + (lbl('Description', d) if d else '') + '</Descriptions>'

COMMON = '''          <IsCustomField>1</IsCustomField>
          <IsAuditEnabled>1</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>1</IsSearchable>
          <IsFilterable>1</IsFilterable>
          <IsRetrievable>1</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
'''
API = '''          <ValidForUpdateApi>1</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>1</ValidForCreateApi>
'''

def pascal(logical):
    # wfp_geographicarea -> wfp_geographicarea (physical name must match logical for custom columns; keep schema name lower-case after prefix)
    return logical

def attr(logical, display, typ, extra, desc='', required='none', mask='ValidForAdvancedFind|ValidForForm|ValidForGrid', custom=True, physical=None):
    physical = physical or logical
    s = '        <attribute PhysicalName="%s">\n          <Type>%s</Type>\n          <Name>%s</Name>\n          <LogicalName>%s</LogicalName>\n          <RequiredLevel>%s</RequiredLevel>\n          <DisplayMask>%s</DisplayMask>\n' % (physical, typ, logical, logical, required, mask)
    s += API + (COMMON if custom else COMMON.replace('<IsCustomField>1</IsCustomField>','<IsCustomField>0</IsCustomField>')) + extra
    s += '          ' + names(display) + '\n          ' + descs(desc) + '\n        </attribute>\n'
    return s

def optionset(name, opts):
    s = '          <optionset Name="%s">\n            <OptionSetType>picklist</OptionSetType>\n            <IntroducedVersion>1.0.0.0</IntroducedVersion>\n            <IsCustomizable>1</IsCustomizable>\n            <displaynames />\n            <Descriptions />\n            <options>\n' % name
    for v, l in opts:
        s += '              <option value="%d" ExternalValue="" IsHidden="0">\n                <labels>%s</labels>\n              </option>\n' % (v, '<label description="%s" languagecode="1033" />' % escape(l))
    s += '            </options>\n          </optionset>\n'
    return s

rels = []
roots = []
for n, t in enumerate(TABLES):
    name = t['name']; roots.append(name)
    pid = name + 'id'
    pname, pdisp, plen = t['primary']
    attrs = ''
    attrs += attr(pid, t['display'], 'primarykey', '          <DefaultValue></DefaultValue>\n'.replace('<DefaultValue></DefaultValue>', '<DefaultValue />') if False else '', t['desc'], 'systemrequired', 'ValidForAdvancedFind|ValidForGrid', physical=name + 'Id')
    attrs += attr(pname, pdisp, 'nvarchar', '          <ImeMode>auto</ImeMode>\n          <Format>text</Format>\n          <MaxLength>%d</MaxLength>\n          <Length>%d</Length>\n' % (plen, plen * 2), '', 'required', 'PrimaryName|ValidForAdvancedFind|ValidForForm|ValidForGrid|RequiredForForm')
    for c in t['cols']:
        logical, disp, kind, arg, note = c
        if kind == 'text':
            attrs += attr(logical, disp, 'nvarchar', '          <ImeMode>auto</ImeMode>\n          <Format>text</Format>\n          <MaxLength>%d</MaxLength>\n          <Length>%d</Length>\n' % (arg, arg * 2), note)
        elif kind == 'memo':
            attrs += attr(logical, disp, 'ntext', '          <ImeMode>auto</ImeMode>\n          <Format>textarea</Format>\n          <MaxLength>%d</MaxLength>\n          <Length>%d</Length>\n' % (arg, arg * 2), note)
        elif kind == 'int':
            attrs += attr(logical, disp, 'int', '          <Format>none</Format>\n          <MinValue>%d</MinValue>\n          <MaxValue>%d</MaxValue>\n' % arg, note)
        elif kind == 'date':
            attrs += attr(logical, disp, 'datetime', '          <Format>date</Format>\n          <CanChangeDateTimeBehavior>1</CanChangeDateTimeBehavior>\n          <Behavior>2</Behavior>\n', note)
        elif kind == 'bool':
            attrs += attr(logical, disp, 'bit', '          <optionset Name="%s_%s">\n            <OptionSetType>bool</OptionSetType>\n            <IntroducedVersion>1.0.0.0</IntroducedVersion>\n            <IsCustomizable>1</IsCustomizable>\n            <displaynames />\n            <Descriptions />\n            <options>\n              <option value="1" ExternalValue="" IsHidden="0"><labels><label description="Yes" languagecode="1033" /></labels></option>\n              <option value="0" ExternalValue="" IsHidden="0"><labels><label description="No" languagecode="1033" /></labels></option>\n            </options>\n          </optionset>\n          <DefaultValue>0</DefaultValue>\n' % (name, logical), note)
        elif kind == 'choice':
            attrs += attr(logical, disp, 'picklist', '          <Format>text</Format>\n          <DefaultValue>-1</DefaultValue>\n' + optionset('%s_%s' % (name, logical), arg), note)
        elif kind == 'lookup':
            attrs += attr(logical, disp, 'lookup', '          <LookupStyle>single</LookupStyle>\n          <LookupTypes />\n', note)
            rels.append((arg, name, logical, disp))
    # state/status
    attrs += attr('statecode', 'Status', 'state', optionset(name + '_statecode', [(0, 'Active'), (1, 'Inactive')]).replace('picklist', 'state') + '          <DefaultValue>0</DefaultValue>\n', '', 'systemrequired', 'ValidForAdvancedFind|ValidForForm|ValidForGrid', False)
    attrs += attr('statuscode', 'Status Reason', 'status', optionset(name + '_statuscode', [(1, 'Active'), (2, 'Inactive')]).replace('picklist', 'status') + '          <DefaultValue>1</DefaultValue>\n', '', 'none', 'ValidForAdvancedFind|ValidForForm|ValidForGrid', False)
    attrs = attrs.replace('<IsCustomField>1</IsCustomField>', '<IsCustomField>1</IsCustomField>')
    x = '''<?xml version="1.0" encoding="utf-8"?>
<Entity>
  <Name LocalizedName="%(display)s" OriginalName="%(display)s">%(name)s</Name>
  <EntityInfo>
    <entity Name="%(name)s">
      <LocalizedNames>%(ln)s</LocalizedNames>
      <LocalizedCollectionNames>%(lc)s</LocalizedCollectionNames>
      <Descriptions>%(ld)s</Descriptions>
      <attributes>
%(attrs)s      </attributes>
      <EntitySetName>%(name)ss</EntitySetName>
      <IsDuplicateCheckSupported>0</IsDuplicateCheckSupported>
      <IsBusinessProcessEnabled>0</IsBusinessProcessEnabled>
      <IsRequiredOffline>0</IsRequiredOffline>
      <IsInteractionCentricEnabled>0</IsInteractionCentricEnabled>
      <IsCollaboration>0</IsCollaboration>
      <AutoRouteToOwnerQueue>0</AutoRouteToOwnerQueue>
      <IsConnectionsEnabled>0</IsConnectionsEnabled>
      <EntityColor />
      <IsDocumentManagementEnabled>0</IsDocumentManagementEnabled>
      <AutoCreateAccessTeams>0</AutoCreateAccessTeams>
      <IsOneNoteIntegrationEnabled>0</IsOneNoteIntegrationEnabled>
      <IsKnowledgeManagementEnabled>0</IsKnowledgeManagementEnabled>
      <IsSLAEnabled>0</IsSLAEnabled>
      <IsDocumentRecommendationsEnabled>0</IsDocumentRecommendationsEnabled>
      <IsBPFEntity>0</IsBPFEntity>
      <OwnershipTypeMask>UserOwned</OwnershipTypeMask>
      <IsAuditEnabled>1</IsAuditEnabled>
      <IsRetrieveAuditEnabled>0</IsRetrieveAuditEnabled>
      <IsRetrieveMultipleAuditEnabled>0</IsRetrieveMultipleAuditEnabled>
      <IsActivity>0</IsActivity>
      <ActivityTypeMask />
      <IsActivityParty>0</IsActivityParty>
      <IsReplicated>0</IsReplicated>
      <IsReplicationUserFiltered>0</IsReplicationUserFiltered>
      <IsMailMergeEnabled>1</IsMailMergeEnabled>
      <IsVisibleInMobile>0</IsVisibleInMobile>
      <IsVisibleInMobileClient>0</IsVisibleInMobileClient>
      <IsReadOnlyInMobileClient>0</IsReadOnlyInMobileClient>
      <IsOfflineInMobileClient>0</IsOfflineInMobileClient>
      <DaysSinceRecordLastModifiedMaxValue />
      <EntityHelpUrlEnabled>0</EntityHelpUrlEnabled>
      <EntityHelpUrl />
      <SyncToExternalSearchIndex>0</SyncToExternalSearchIndex>
      <IntroducedVersion>1.0.0.0</IntroducedVersion>
      <IsCustomizable>1</IsCustomizable>
      <IsRenameable>1</IsRenameable>
      <IsMappable>1</IsMappable>
      <CanModifyAuditSettings>1</CanModifyAuditSettings>
      <CanModifyMobileVisibility>1</CanModifyMobileVisibility>
      <CanModifyMobileClientVisibility>1</CanModifyMobileClientVisibility>
      <CanModifyMobileClientReadOnly>1</CanModifyMobileClientReadOnly>
      <CanModifyMobileClientOffline>1</CanModifyMobileClientOffline>
      <CanModifyConnectionSettings>1</CanModifyConnectionSettings>
      <CanModifyDuplicateDetectionSettings>1</CanModifyDuplicateDetectionSettings>
      <CanModifyMailMergeSettings>1</CanModifyMailMergeSettings>
      <CanModifyQueueSettings>1</CanModifyQueueSettings>
      <CanCreateAttributes>1</CanCreateAttributes>
      <CanCreateForms>1</CanCreateForms>
      <CanCreateCharts>1</CanCreateCharts>
      <CanCreateViews>1</CanCreateViews>
      <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
      <CanChangeHierarchicalRelationship>1</CanChangeHierarchicalRelationship>
      <CanChangeTrackingBeEnabled>1</CanChangeTrackingBeEnabled>
      <IsEnabledForExternalChannels>0</IsEnabledForExternalChannels>
      <EnforceStateTransitions>0</EnforceStateTransitions>
    </entity>
  </EntityInfo>
  <FormXml />
  <SavedQueries />
  <RibbonDiffXml>
    <CustomActions />
    <Templates><RibbonTemplates Id="Mscrm.Templates"></RibbonTemplates></Templates>
    <CommandDefinitions />
    <RuleDefinitions><TabDisplayRules /><DisplayRules /><EnableRules /></RuleDefinitions>
    <LocLabels />
  </RibbonDiffXml>
</Entity>
''' % dict(display=escape(t['display']), name=name, ln=lbl('LocalizedName', t['display']), lc=lbl('LocalizedCollectionName', t['plural']), ld=lbl('Description', t['desc']), attrs=attrs)
    os.makedirs('%s/Entities/%s' % (OUT, name))
    open('%s/Entities/%s/Entity.xml' % (OUT, name), 'w').write(x)

# relationships
R = '<?xml version="1.0" encoding="utf-8"?>\n<EntityRelationships>\n'
seen = set()
for target, src, logical, disp in rels:
    rn = '%s_%s_%s' % (target, src, logical) if logical != target else '%s_%s' % (src, logical)
    rn = 'wfp_%s_%s' % (src[4:], logical[4:])
    assert rn not in seen; seen.add(rn)
    R += '''  <EntityRelationship Name="%s">
    <EntityRelationshipType>OneToMany</EntityRelationshipType>
    <IsCustomizable>1</IsCustomizable>
    <IntroducedVersion>1.0.0.0</IntroducedVersion>
    <IsHierarchical>0</IsHierarchical>
    <ReferencingEntityName>%s</ReferencingEntityName>
    <ReferencedEntityName>%s</ReferencedEntityName>
    <CascadeAssign>NoCascade</CascadeAssign>
    <CascadeDelete>Restrict</CascadeDelete>
    <CascadeReparent>NoCascade</CascadeReparent>
    <CascadeShare>NoCascade</CascadeShare>
    <CascadeUnshare>NoCascade</CascadeUnshare>
    <CascadeRollupView>NoCascade</CascadeRollupView>
    <ReferencingAttributeName>%s</ReferencingAttributeName>
    <RelationshipDescription>
      <Descriptions><Description description="" languagecode="1033" /></Descriptions>
    </RelationshipDescription>
    <EntityRelationshipRoles>
      <EntityRelationshipRole>
        <NavPaneDisplayOption>UseCollectionName</NavPaneDisplayOption>
        <NavPaneArea>Details</NavPaneArea>
        <NavPaneOrder>10000</NavPaneOrder>
        <NavigationPropertyName>%s</NavigationPropertyName>
        <RelationshipRoleType>1</RelationshipRoleType>
      </EntityRelationshipRole>
      <EntityRelationshipRole>
        <NavPaneDisplayOption>DoNotDisplay</NavPaneDisplayOption>
        <NavPaneArea>Details</NavPaneArea>
        <NavPaneOrder>10000</NavPaneOrder>
        <NavigationPropertyName>%s</NavigationPropertyName>
        <RelationshipRoleType>0</RelationshipRoleType>
      </EntityRelationshipRole>
    </EntityRelationshipRoles>
  </EntityRelationship>
''' % (rn, src, target, logical, rn, logical)
R += '</EntityRelationships>\n'
open(OUT + '/Other/Relationships.xml', 'w').write(R)

open(OUT + '/Other/Customizations.xml', 'w').write('''<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Entities />
  <Roles />
  <Workflows />
  <FieldSecurityProfiles />
  <Templates />
  <EntityMaps />
  <EntityRelationships />
  <OrganizationSettings />
  <optionsets />
  <CustomControls />
  <EntityDataProviders />
  <Languages>
    <Language>1033</Language>
  </Languages>
</ImportExportXml>
''')

open(OUT + '/Other/Solution.xml', 'w').write('''<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml version="9.2.0.0" SolutionPackageVersion="9.2" languagecode="1033" generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" OrganizationVersion="9.2.0.0" OrganizationSchemaType="Standard" CRMServerServiceabilityVersion="9.2.0.0">
  <SolutionManifest>
    <UniqueName>%s</UniqueName>
    <LocalizedNames>
      <LocalizedName description="%s" languagecode="1033" />
    </LocalizedNames>
    <Descriptions />
    <Version>1.0.0.0</Version>
    <Managed>0</Managed>
    <Publisher>
      <UniqueName>wfp</UniqueName>
      <LocalizedNames>
        <LocalizedName description="Workforce Planner" languagecode="1033" />
      </LocalizedNames>
      <Descriptions />
      <EMailAddress xsi:nil="true"></EMailAddress>
      <SupportingWebsiteUrl xsi:nil="true"></SupportingWebsiteUrl>
      <CustomizationPrefix>wfp</CustomizationPrefix>
      <CustomizationOptionValuePrefix>10000</CustomizationOptionValuePrefix>
      <Addresses>
        <Address><AddressNumber>1</AddressNumber><AddressTypeCode>1</AddressTypeCode><City xsi:nil="true"></City><County xsi:nil="true"></County><Country xsi:nil="true"></Country><Fax xsi:nil="true"></Fax><FreightTermsCode xsi:nil="true"></FreightTermsCode><ImportSequenceNumber xsi:nil="true"></ImportSequenceNumber><Latitude xsi:nil="true"></Latitude><Line1 xsi:nil="true"></Line1><Line2 xsi:nil="true"></Line2><Line3 xsi:nil="true"></Line3><Longitude xsi:nil="true"></Longitude><Name xsi:nil="true"></Name><PostalCode xsi:nil="true"></PostalCode><PostOfficeBox xsi:nil="true"></PostOfficeBox><PrimaryContactName xsi:nil="true"></PrimaryContactName><ShippingMethodCode>1</ShippingMethodCode><StateOrProvince xsi:nil="true"></StateOrProvince><Telephone1 xsi:nil="true"></Telephone1><Telephone2 xsi:nil="true"></Telephone2><Telephone3 xsi:nil="true"></Telephone3><TimeZoneRuleVersionNumber xsi:nil="true"></TimeZoneRuleVersionNumber><UPSZone xsi:nil="true"></UPSZone><UTCOffset xsi:nil="true"></UTCOffset><UTCConversionTimeZoneCode xsi:nil="true"></UTCConversionTimeZoneCode></Address>
        <Address><AddressNumber>2</AddressNumber><AddressTypeCode>1</AddressTypeCode><ShippingMethodCode>1</ShippingMethodCode></Address>
      </Addresses>
    </Publisher>
    <RootComponents>
%s    </RootComponents>
    <MissingDependencies />
  </SolutionManifest>
</ImportExportXml>
''' % (SOLNAME, SOLDISP, ''.join('      <RootComponent type="1" schemaName="%s" behavior="0" />\n' % r for r in roots)))
print('ok', len(rels), 'relationships')
