Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    launch: function() {
        var me = this;
        this.cardboard = Ext.create('Rally.ui.cardboard.CardBoard',{
            types: ['PortfolioItem/Feature'],
            context: this.getContext(),
            attribute: 'Release',
            columnConfig: {
                cardLimit: 500,
                xtype: 'rallycardboardcolumn',
                displayField: 'Name',
                valueField: '_ref',
                plugins: [                    
                    {ptype:'tscolumnheaderupdater', field_to_aggregate: 'c_PIPlanEstimate'}
                ]
            },
            storeConfig:{ limit: 500 },
            cardConfig: {
                showIconsAndHighlightBorder: false,
                fields: [
                    'FormattedID',
                    'Name',
                    /*{ name: 'Project', renderer: me._renderProject },*/
                    'State',
                    { name: 'c_PIPlanEstimate', fetch: ['c_PIPlanEstimate'] }
                ],
                listeners: {
                    added: function(card,container){
                        me.logger.log(this,card,container);
                    }
                }
            }
        });
        this.add(this.cardboard);
    }
});
