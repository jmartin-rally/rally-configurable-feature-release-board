/*
 * modify more items so it pushes to the pi page
 */
 
Ext.override(Rally.ui.cardboard.MoreItems,{
    token: '/portfolioitems'
});

/*
 * Modify the building of columns based on release instead of a string drop-down
 */

Ext.override(Rally.ui.cardboard.CardBoard,{

    _buildColumnsFromModel: function() {
        var me = this;
        var model = this.models[0];
        if (model) {
            if ( this.attribute === "Release" ) { 
                var retrievedColumns = [];
                retrievedColumns.push({
                    
                    value: null,
                    columnHeaderConfig: {
                        headerTpl: "{name}",
                        headerData: {
                            name: "Backlog"
                        }
                    }
                });

                this._getLocalReleases(retrievedColumns);
            }
        }
    },
    _getLocalReleases: function(retrievedColumns) {
        var me = this;
                        
        var today_iso = Rally.util.DateTime.toIsoString(new Date(),false);
        var filters = [{property:'ReleaseDate',operator:'>',value:today_iso}];
        
        var iteration_names = [];
        
        Ext.create('Rally.data.WsapiDataStore',{
            model:me.attribute,
            autoLoad: true,
            filters: filters,
            context: { projectScopeUp: false, projectScopeDown: false },
            sorters: [
                {
                    property: 'ReleaseDate',
                    direction: 'ASC'
                }
            ],
            limit: 3,
            pageSize: 3,
            fetch: ['Name','ReleaseStartDate','ReleaseDate','PlannedVelocity'],
            listeners: {
                load: function(store,records) {
                    Ext.Array.each(records, function(record){
                        var start_date = Rally.util.DateTime.formatWithNoYearWithDefault(record.get('ReleaseStartDate'));
                        var end_date = Rally.util.DateTime.formatWithNoYearWithDefault(record.get('ReleaseDate'));
                        iteration_names.push(record.get('Name'));
                        
                        retrievedColumns.push({
                            value: record,
                            _planned_velocity_total: 0,
                            _planned_velocity_self: 0,
                            _planned_velocity_direct_children: 0,
                            _planned_velocity_leaves: 0,
                            _planned_velocity: 0,
                            _missing_estimate: false,
                            columnHeaderConfig: {
                                headerTpl: "{name}<br/>{start_date} - {end_date}",
                                headerData: {
                                    name: record.get('Name'),
                                    start_date: start_date,
                                    end_date: end_date,
                                    planned_velocity: 0,
                                    missing_estimate: false
                                }
                            }
                        });
                    });
                    this._getAllReleases(retrievedColumns,iteration_names);
                },
                scope: this
            }
        });
    },
    _getAllReleases: function(retrievedColumns,iteration_names) {
        var me = this;
                        
        var today_iso = Rally.util.DateTime.toIsoString(new Date(),false);
        var filters = [{property:'ReleaseDate',operator:'>',value:today_iso}];

        Ext.create('Rally.data.WsapiDataStore',{
            model:me.attribute,
            autoLoad: true,
            filters: filters,
            sorters: [
                {
                    property: 'ReleaseDate',
                    direction: 'ASC'
                }
            ],
            fetch: ['Name','Project','PlannedVelocity','Children','Parent', 'ObjectID'],
            listeners: {
                load: function(store,records) {
                    var current_project = null;
                    if ( this.context ) {
                        current_project = this.context.getProject();
                    }
                    Ext.Array.each(records, function(record){
                        var project = record.get('Project');
                        var planned_velocity = record.get('PlannedVelocity') || 0;
                        var index = Ext.Array.indexOf(iteration_names,record.get('Name'));
                        
                        retrievedColumns[index+1]._planned_velocity_total += planned_velocity;
                        if ( project.Children.Count == 0 ) {
                            retrievedColumns[index+1]._planned_velocity_leaves += planned_velocity;
                        }
                        if ( project.ObjectID == current_project.ObjectID ) {
                            retrievedColumns[index+1]._planned_velocity_self += planned_velocity;                            
                        }
                        if ( project.Parent && project.Parent.ObjectID == current_project.ObjectID ) {
                            retrievedColumns[index+1]._planned_velocity_direct_children += planned_velocity;
                        }
                        
                        // SHOW the larger of direct children sum , self's sum
                        
                        if ( retrievedColumns[index+1]._planned_velocity_self > retrievedColumns[index+1]._planned_velocity_direct_children ) {
                            retrievedColumns[index+1]._planned_velocity = retrievedColumns[index+1]._planned_velocity_self;
                        } else {
                            retrievedColumns[index+1]._planned_velocity = retrievedColumns[index+1]._planned_velocity_direct_children;                            
                        }
                    });
                    this.fireEvent('columnsretrieved',this,retrievedColumns);
                    this.columnDefinitions = [];
                    _.map(retrievedColumns,this.addColumn,this);
                    this._renderColumns();
                },
                scope: this
            }
        });
    }
});

Ext.override(Rally.ui.cardboard.Card,{
    _setupPlugins: function() {
        var cardContentRightPlugin = {ptype: 'rallycardcontentright'};

        this.plugins.push(cardContentRightPlugin);
        this.plugins.push({ptype: 'rallycardcontentleft'});

        if (this.record.get('updatable')) {
            if (this.editable) {
                this.addCls('editable');
                this.plugins.push({ptype: 'rallycardediting'});

                var predicateFn = Rally.predicate.RecordPredicates.hasField('PlanEstimate');
                if (predicateFn(this.record) && Ext.Array.contains(this.getFields(), 'PlanEstimate')) {
                    cardContentRightPlugin.showPlanEstimate = true;
                }

                if (this.enableValidationUi) {
                    this.plugins.push({ptype: 'rallycardvalidation'});
                    this.plugins.push({ptype: 'rallycardvalidationui', notificationFieldNames: ['PlanEstimate']});
                }
            }

            if (this.showIconsAndHighlightBorder) {
                this.plugins.push({
                    ptype: 'rallycardicons',
                    showMenus: this.showIconMenus,
                    showColorPopover: this.showColorPopover
                });
            }
        }

        if (this.showAge > -1) {
            this.plugins.push({ptype: 'rallycardage'});
        }
        
        this.plugins.push({ptype:'tscardreleasealignment'});
    }
});

Ext.override(Rally.ui.cardboard.Column,{
    getStoreFilter: function(model) {
        var property = this.attribute;
        var value = this.getValue();
        if ( this.attribute == "Release" ) {
            property = "Release.Name";
            if ( value ) {
                value = value.get('Name');
            }
        }
        return {
            property:property,
            operator: '=',
            value: value
        };
    },
    isMatchingRecord: function(record) {
        var recordValue = record.get(this.attribute);
        if (recordValue) {
            recordValue = recordValue.Name;
        }
        var columnValue = this.getValue();
        if ( columnValue ) {
            columnValue = columnValue.get('Name');
        }
        
        return (columnValue === recordValue );
    },
    addCard: function(card, index, highlight) {
        var record = card.getRecord();
        var target_value = this.getValue();
        
        if ( target_value && typeof(target_value.get) === "function" ) {
            target_value = this.getValue().get('_ref');
        }
        
        record.set(this.attribute,target_value);
        
        if (!Ext.isNumber(index)) {
            //find where it should go
            var records = Ext.clone(this.getRecords());
            records.push(record);
            this._sortRecords(records);

            var recordIndex = 0;
            for (var iIndex = 0, l = records.length; iIndex < l; iIndex++) {
                var i = records[iIndex];
                if (i.get("ObjectID") === record.get("ObjectID")) {
                    recordIndex = iIndex;
                    break;
                }
            }
            index = recordIndex;
        }

        this._renderCard(card, index);

        if (highlight) {
            card.highlight();
        }

        this.fireEvent('addcard');
        card.fireEvent('ready', card);
    },
    _sortRecords: function(records) {
            var sortProperty = this._getSortProperty(),
                sortAscending = this._getSortDirection() === 'ASC',
                valA, valB;

                // force to new rank style
                sortProperty = "DragAndDropRank";

            records.sort(function(a, b) {
                valA = a.get(sortProperty);
                if (valA && valA._refObjectName) {
                    valA = valA._refObjectName;
                }
                valB = b.get(sortProperty);
                if (valB && valB._refObjectName) {
                    valB = valB._refObjectName;
                }

                if (valA === valB) {
                    return 0;
                }

                if (valA !== null && valA !== undefined) {
                    if (valB === null || valB === undefined) {
                        return sortAscending ? -1 : 1;
                    } else {
                        return valA > valB ? (sortAscending ? 1 : -1) : (sortAscending ? -1 : 1);
                    }
                } else if (valB !== null && valB !== undefined) {
                    if (valA === null || valA === undefined) {
                        return sortAscending ? 1 : -1;
                    } else {
                        return valB > valA ? (sortAscending ? -1 : 1) : (sortAscending ? 1 : -1);
                    }
                }

                //Default case (dates, objects, etc.)
                return sortAscending ? valA - valB : valB - valA;
            });
        }
});

