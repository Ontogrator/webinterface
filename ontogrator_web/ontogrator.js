// ===============================================================================================

// REMEMBER! The php file "config.php" also contains configuration!

// The PANEs and their associated ontologies
var ontoName = [ 'PANE01', 'PANE02', 'PANE03', 'PANE04' ];
var ontoLongName = [ 'Biomedical Investigations', 'National Drug File', 'Foundational Model of Anatomy', 'Miscellaneous' ];

// The TABs and their associated sources
var dataSourceNameList = [ 'ALLTAB', 'TAB01', 'TAB02', 'TAB03' ];
var dataSourceTitleList = [ 'All', 'PubMed', 'Pubget', 'ClinicalTrials.gov' ];

// how many rows to display per page
var gridPageSize = 10;
  
// ::TODO:: should be in the meta-data retrieved from the server
function ontoShortNameToLongName( shortName )
{
    for( var o = 0; o < ontoName.length; o++ )
    {
	if( ontoName[ o ] == shortName )
	{
	    return ontoLongName[ o ];
	}
    }     
    return shortName;  // no better answer
}

// ===============================================================================================
// reasonably efficient trimmer

function trim10(str) 
{
    var whitespace = ' \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000';
    for (var i = 0; i < str.length; i++) {
	if (whitespace.indexOf(str.charAt(i)) === -1) {
	    str = str.substring(i);
	    break;
	}
    }
    for (i = str.length - 1; i >= 0; i--) {
	if (whitespace.indexOf(str.charAt(i)) === -1) {
	    str = str.substring(0, i + 1);
	    break;
	}
    }
    return whitespace.indexOf(str.charAt(0)) === -1 ? str : '';
}


function pluralise( singular, plural, count )
{
    return count + ' ' + ( ( count == 1 ) ? singular : plural );
}


function utfDecode( utftext )   // not used - debug only
{
    var string = "";
    var i = 0;
    var c = c1 = c2 = 0;
    
    while ( i < utftext.length ) 
    {
	
	c = utftext.charCodeAt(i);
	
	if (c < 128) 
	{
	    string += String.fromCharCode(c);
	    i++;
	}
	else 
	{
	    if((c > 191) && (c < 224)) 
	    {
		c2 = utftext.charCodeAt(i+1);
		string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
		i += 2;
	    }
	    else 
	    {
		c2 = utftext.charCodeAt(i+1);
		c3 = utftext.charCodeAt(i+2);
		string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
		i += 3;
	    }
	}
    }
    
    return string;
}


// ===============================================================================================
// extjs tweakage

// this kludge allows ComboBoxen to match any point in the string, rather than just at the start, 
// see http://extjs.com/forum/showthread.php?t=31701
Ext.override( Ext.form.ComboBox, {
    anyMatch: false,
    doQuery : function(q, forceAll){
        if(q === undefined || q === null){
            q = '';
        }
        var qe = {
            query: q,
            forceAll: forceAll,
            combo: this,
            cancel:false
        };
        if(this.fireEvent('beforequery', qe)===false || qe.cancel){
            return false;
        }
        q = qe.query;
        forceAll = qe.forceAll;
        if(forceAll === true || (q.length >= this.minChars)){
            if(this.lastQuery !== q){
                this.lastQuery = q;
                if(this.mode == 'local'){
                    this.selectedIndex = -1;
                    if(forceAll){
                        this.store.clearFilter();
                    }else{
                        this.store.filter(this.displayField, q, this.anyMatch);
                    }
                    this.onLoad();
                }else{
                    this.store.baseParams[this.queryParam] = q;
                    this.store.load({
                        params: this.getParams(q)
                    });
                    this.expand();
                }
            }else{
                this.selectedIndex = -1;
                this.onLoad();
            }
        }
    }
});

// ===============================================================================================


function setBusy( isBusy )
{
    document.getElementById( 'spinner' ).style.display = isBusy ? "inline" : "none";
}



// ===============================================================================================

var ontoTree = {};
var ontoBrowser = {};
var removeButton = {};
var gridPanel = {};
var selectedTerm = {};


// most of the gui state, i.e. which terms are selected, handles for the per-ontology trees and browsers and suchlike is in here 
var guiState = {};

var selectedDataSourceName = null;

var firstTree = null;

// globals for widgets and layout
var helpWindow, queryToolbar, viewport, pagingBar, tabPanel;
var treeHeight, treeWidth, comboBoxWidth, gridHeight;

// still haven't worked out how to get this from ExtJS...it must be in there somewhere..
function getViewportSize() 
{
    var myWidth = 0, myHeight = 0;
    if( typeof( window.innerWidth ) == 'number' ) 
    {
	//Non-IE
	myWidth = window.innerWidth;
	myHeight = window.innerHeight;
    } 
    else 
    {
	if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) 
	{
	    //IE 6+ in 'standards compliant mode'
	    myWidth = document.documentElement.clientWidth;
	    myHeight = document.documentElement.clientHeight;
	} else
	{
	    if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) 
	    {
		//IE 4 compatible
		myWidth = document.body.clientWidth;
		myHeight = document.body.clientHeight;
	    }
	}
    }
    return { height:myHeight, width:myWidth };
}

// activate the popup
function displayHelpWindow()
{
    if( helpWindow == null )
    {
	helpWindow = new Ext.Window({ applyTo     : 'helpWindow',
				      layout      : 'fit',
				      width       : 500,
				      height      : 600,
				      closeAction :'hide',
				      plain       : true,
				      items       : new Ext.TabPanel( { applyTo        : 'helpTabs',
								        autoTabs       : true,
									activeTab      : 0,
									deferredRender : false,
									border         : false } ),
				      buttons: [ { text : 'Close', handler: function() { helpWindow.hide(); } } ] } );
    }
    
    helpWindow.show( Ext.get('helpButton') );
}

// wierdly, there is no built-in equivalent for this
function findChildRecursively( node, attribute, value ) 
{
    if( node.attributes[ attribute ] == value )
    {
	return node;
    }

    var childNodes = node.childNodes;

    if( childNodes != null )
    {
	for(var i = 0, len = childNodes.length; i < len; i++) 
	{
	    var found = findChildRecursively( childNodes[ i ], attribute, value );
	    
	    if( found != null )
	    {
		return found;
	    }
	}
    }

    return null;
} 


function makeOntologyTree( name, skipDepth, expandDepth )
{
    var node = new Ext.tree.TreeNode( { text: name, expanded: true }  );
    
    var selectionListener = new Ext.tree.MultiSelectionModel();

    selectionListener.addListener( 'selectionchange', 
				   function( model, nodes  ) 
				   { 
				       var comboBoxen = ontoBrowser[ name ].find( 'ontology', name );  // wipe the associated combo box
				       comboBoxen[ 0 ].clearValue(); 

				       if( nodes.length > 0 )
				       {
					   var selectedTerms = [];
					   
					   for( var t = 0; t < nodes.length; t++ )  // grab the selected terms into a []
					   {
					       selectedTerms.push( nodes[ t ].attributes.termName );
					   }
					   
					   selectedTerm[ name ] = selectedTerms;
				       }
				       else
				       {
					   selectedTerm[ name ] = null;
				       }

				       startQuery(); 
				   } );

    var tree = new Ext.tree.TreePanel({
	ontologyName: name,
	selModel: selectionListener,
	root: node,
	rootVisible: false,
	autoScroll: true,
	useArrows: false,
	width: treeWidth,
	height: treeHeight - 28,
	margins: '2 2 2 2',
	region: 'center',
	frame: false,
	border:true,
	animate: true });
    
    /*
    tree.addListener( 'click', 
		      function( node, e ) 
		      { 
			  
		      } );
    */

    tree.addListener( 'expandnode', 
		      function( node ) 
		      { 
			  expandOntologyNode( name, node );
		      } );


    return tree;
}

// a combination of a combo-box and a tree
//
function makeOntologyBrowser( shortName, longName, tree )
{
    var ontologySearchProxy = new Ext.data.HttpProxy ({ url: 'database-ontology-search.php' });
    
    //  tweak the params for the request (to customize the URL properly)
    //
    ontologySearchProxy.on('beforeload', function( p, params ) 
			   { params.ont = shortName;
			     params.part = params.query;
			   });
    
    var remoteLookupStore = new Ext.data.Store({
        proxy:ontologySearchProxy,
        reader: new Ext.data.JsonReader( { root: 'terms',
					   totalProperty: 'nResults' }, 
 	                                   [ {name: 'term', mapping: 'term'} ] )
	});


    var comboBox = new Ext.form.ComboBox({
	ontology: shortName,     // so we can find this component by name later on    
	anyMatch: true,
	store: remoteLookupStore,
	displayField:'term',   // matches the Record above
	width: comboBoxWidth,
	margins: '0 0 0 0',
	emptyText:'Search...',
	triggerAction: 'all',
	frame:false,
	border:false });
    
    comboBox.addListener( 'select', function( combo, record, index ) 
			  {   
					var node = findChildRecursively( ontoTree[ shortName ].getRootNode(), 'termName', record.data.term );
					
					if( node != null )
					{
						node.ensureVisible( function() { node.getOwnerTree().getSelectionModel().select(node, null, true); } );
					}
					else
					{
						expandHierarchyToNode( shortName, record.data.term );
					}
					
					startQuery();
			  } );
	

    var comboPanel = new Ext.Panel( { 
	margins: '3 0 0 3',
	region: 'north', 
	autoWidth: true,
	frame:false,
	border:false,
	height: 22,
	items: [ comboBox ] } );


    var buttonBar = new Ext.Toolbar( {
	items: [ { xtype: 'tbtext',
		   text: '<b>' + longName + '</b>' },  // greedy space fill
                 { xtype: 'tbfill' },  // greedy space fill
	         '-',  // veritcal separator
                 { xtype: 'button', // same as 'tbsplitbutton'
		   tooltip: 'Press this button to clear the<br/>selection in this tree',
		   handler: function() { clearOntologySelection( shortName ); 
					 startQuery(); },
		   text: 'Clear' } ] } );


    // put the combo and tree into a simple layout
   
    var treePlusCombo = new Ext.Panel( { 
	layout: 'border',
	width:treeHeight,
	height:treeWidth,
	margins: '0 0 0 0',
	split: true,
	tbar: buttonBar,
	items: [  comboPanel, tree ] } );

    // keep the combobox the same width as its tree
    treePlusCombo.addListener( 'afterlayout', 
			       function() 
			       {   // manually resize the combobox
				   var size = treePlusCombo.getSize();
				   comboBox.setWidth( size.width - 7 ); 
			       } );

    return treePlusCombo;
}



Ext.onReady(function() 
{
    Ext.QuickTips.init();

    var viewportSize = getViewportSize();

    //alert( viewportSize.width + "x" + viewportSize.height );

    treeWidth = viewportSize.width * 0.25;

    comboBoxWidth = treeWidth - 20;
    
    gridHeight = ( viewportSize.height - 80 )* 0.6;
    treeHeight = ( viewportSize.height - 80 )* 0.4;

 
    // == 1 =======================================================
    // the data viewing grid

    pagingBar = new Ext.PagingToolbar({
        pageSize: gridPageSize,
        store: null, 
        displayInfo: true,
        displayMsg: 'Results {0} - {1} of {2}',
        emptyMsg: "No data"
	});


    queryToolbar = new Ext.Toolbar( [ new Ext.Toolbar.TextItem( { text: 'Search query:' } ) ] );

    // create the editor grid
   

    // tab panel selector
    
    var dataSourcetabs = [];

    for( var i = 0; i < dataSourceNameList.length; i++ )
    {
	dataSourcetabs.push( { title: dataSourceTitleList[ i ], dataSourceName: dataSourceNameList[ i ], dataSourceTitle: dataSourceTitleList[ i ] } );
    }

    selectedDataSourceName = dataSourceNameList[ 0 ];  // default is the first tab

    tabPanel = new Ext.TabPanel({
	activeTab: 0,
	
	frame: false,
	border: false,
	
	region: 'center',
	split: false,
	
	/*autoHeight:true,*/

	height: gridHeight,

	items: dataSourcetabs
	});


    var southPanel = new Ext.Panel( { layout: 'border', frame: false, border: false, height: gridHeight, split: true, region: 'south', items: [ tabPanel ], tbar:queryToolbar, bbar: pagingBar } );

   
    // == 2 =======================================================
    // build the ontoBrowsers

    for( var o = 0; o < ontoName.length; o++ )
    {
	var shortName = ontoName[ o ];

	ontoTree[ shortName ] = makeOntologyTree( shortName, 0, 0 );

	ontoBrowser[ shortName ] = makeOntologyBrowser( shortName, ontoLongName[ o ], ontoTree[ shortName ] );
    }

    // keep the trees organised in a linked list starting at 'firstTree' so we can easily iterate over them
    
    for( var o = 0; o < ( ontoName.length - 1 ); o++ )
    {
	if( o == 0)
	{
	    firstTree = ontoTree[ ontoName[ o ] ];
	}
	
	ontoTree[ ontoName[ o ] ].nextTree = ontoTree[ ontoName[ o + 1] ];
    }

    // and insert them into containers
    //
    // we'll have one ontoBrowser in the east and west containers, and
    // a nested panel in the center container; in this nested panel,
    // have another pair of ontoBrowsers
	

    var westPanel   = new Ext.Panel( { border: false, bodyBorder: false, width: treeWidth, height: treeHeight, split: true, region: 'west',   items: [ ontoBrowser[ 'PANE01' ]  ] } );

   var innerCenterPanel = new Ext.Panel( { border: false, bodyBorder: false, width: treeWidth, height: treeHeight, split: true, region: 'center', items: [ ontoBrowser[ 'PANE02' ] ] } );

     var innerEastPanel = new Ext.Panel( { border: false, bodyBorder: false, width: treeWidth, height: treeHeight, split: true, region: 'east', items: [ ontoBrowser[ 'PANE03' ] ] } );

   var centerPanel = new Ext.Panel( { layout: 'border', border: false, bodyBorder: false, width: 2 * treeWidth, height: treeHeight, split: true, region: 'center', items: [ innerEastPanel, innerCenterPanel ] } );

   var eastPanel   = new Ext.Panel( { border: false, bodyBorder: false, width: treeWidth, height: treeHeight, split: true, region: 'east',   items: [ ontoBrowser[ 'PANE04' ]  ] } );



    // == 5 =======================================================
    // the 'info' panel

    var northPanel = new Ext.Panel({
	id: 'infoPanel',    
	region: 'north',
	split: false,
	height: 64,
	frame: false,
	collapsible: false,
	margins: '0 0 0 0',
	contentEl: 'infoHeader',
	border:false
        }); 
    	

    // == 6 =======================================================
    // glue it all together

    // keep the contained panel the same size as the container

    


    eastPanel.addListener( 'resize', 
			   function() 
			   { 
			       var size = eastPanel.getSize();
			       
			       ontoBrowser[ 'PANE04' ].setSize( { width:size.width, height:size.height/*-26*/ } ); 
			   } );

    innerEastPanel.addListener( 'resize', 
				function() 
				{ 
				    var size = innerEastPanel.getSize();
				    
				    ontoBrowser[ 'PANE03' ].setSize( { width:size.width, height:size.height/*-26*/ } ); 
				} );
    
    innerCenterPanel.addListener( 'resize', 
				  function() 
				  { 
				      var size = innerCenterPanel.getSize();
				      
				      ontoBrowser[ 'PANE02' ].setSize( { width:size.width, height:size.height/*-26*/ } ); 
				      // ontoBrowser[ 'DATE' ].setSize( size ); 
				  } );
    
    westPanel.addListener( 'resize', 
			   function() 
			   { 
			       var size = westPanel.getSize();
			       
			       ontoBrowser[ 'PANE01' ].setSize( { width:size.width, height:size.height/*-26*/ } ); 
			   } );
 
    viewport = new Ext.Viewport( { 
	layout: 'border',
	margins: '0 0 0 0',
	items: [northPanel, eastPanel, westPanel, centerPanel, southPanel ] } );
  
    // may or may not be sufficient to force the layout to work...

    viewport.setHeight( 800 );

    tabPanel.addListener( 'tabchange', 
			  function( panel, tab ) 
			  { 
			      selectedDataSourceName = tab.dataSourceName;

			      setBusy( true );

			      resetHitCountsForOntologyTerms();

			      resetHitCountsForAllSources();

			      requestDataSourceBrowse();

			  } );

   

   // do the initial load
    
    startQuery();

});



// ===============================================================================================
// initialisation

function addNodesToTree( options, wasSuccess, response )
{
    if( ! wasSuccess )
    {
	alert( "Server not responding. Please try again later." );
	return;
    }

    // we expect one term per line, the 'node' parameter data tells us which tree to put it in...

    var parentNode = options[ "node" ];

    if( parentNode.attributes[ 'isResolved' ] == true )
    {
	// alert( "already resolved - ignoring" );

	return;
    }



    var lines = response.responseText.split(  "\n" );


    //alert( response.responseText + "\n\n[" + lines.length + " lines]" );


    for( var l = 0; l < lines.length; l++ )
    {
	var text = trim10( lines[ l ] );

	if( text.length > 0 )
	{
		var cols = text.split("\t");
	
		// the first character of the term is either "1" if that term has its own children, or "0" if it does not
		var hasChildren = ( cols[0] == '1' );

	    var termName = cols[1];
	    
		var existsNode = findChildRecursively( parentNode, 'termName', termName );
		if(existsNode != null)
			continue;
			
		var node = new Ext.tree.TreeNode( { text: termName, expanded: false } ); 
	    
	    node.attributes[ 'termName' ] = termName;
	    node.attributes[ 'hitCount' ] = 0;
	    
	    if( hasChildren )
	    {
		node.appendChild( new Ext.tree.TreeNode( { text: '<I>[loading]</I>', expanded: false, isDummy: true, isResolved: false } ) );
	    }
	    
	    parentNode.appendChild( node );
	}
    }
    
    var loadingNode = parentNode.findChild( 'isDummy', true );

    if( loadingNode != null )
    {
	parentNode.removeChild( loadingNode );
    }

    // make sure we don't try to expand this node again:
    //
    parentNode.attributes[ 'isResolved' ] = true;

    // and now issue a request for the ontology hit counts for these new nodes
    
    if( typeof( parentNode.attributes[ 'termName' ] ) != 'undefined' )
    {
	//...var ontIndex = ontoNameToIndex( options.tree );
	//alert( 'asking for ontology-hit-counts for ' + parentNode.attributes[ 'termName' ] + ' in ' + options.tree + ' (' + ontIndex + ')' );
	
	var tree = options[ "node" ].getOwnerTree();

	requestHitCountForOntologyTerms( { isOneOff: true, tree: tree, startNode: parentNode, dataSourceName: selectedDataSourceName } );
    }
}

function addHierarchyToTree( options, wasSuccess, response )
{
	if(!wasSuccess )
	{
		alert( "Server not responding. Please try again later." );
		return;
	}

	var shortName = options[ "ont" ];
	var tree = ontoTree[shortName];
	
	var lines = response.responseText.split("\n");
	// There is always a blank last line
	var lineCount = lines.length - 1;

	var root = tree.getRootNode();
	var top = null;
	var parent = null;
	var lastDepth = -1;
	
    for(var l = 0; l < lineCount; l++ )
    {
		var text = trim10( lines[ l ] );

		if(text.length == 0)
			continue;
			
		var cols = text.split("\t");
	
		// the first character of the term is either "1" if that term has its own children, or "0" if it does not
		var hasChildren = ( cols[0] == '1' );
		var termName = cols[1];
		var depth = cols[2];
		
		// We don't want to get confused with multiple inheritance
		if(depth == lastDepth)
			continue;
		
		lastDepth = depth;
		
		var node = findChildRecursively( root, 'termName', termName );
		
		if(node == null)
		{
    	    var node = new Ext.tree.TreeNode( { text: termName, expanded: false } ); 
	    
			node.attributes[ 'termName' ] = termName;
			node.attributes[ 'hitCount' ] = 0;

			if(parent == null)
				root.appendChild(node);
			else
				parent.appendChild(node);
			
			// The last line (the bottom node)?
			if(l == (lineCount - 1))
			{
				node.attributes[ 'isResolved' ] = false;				
				if(hasChildren)
					node.appendChild( new Ext.tree.TreeNode( { text: '<I>[loading]</I>', expanded: false, isDummy: true, isResolved: false } ) );
			}
			else
				node.attributes[ 'isResolved' ] = false;
		}
		else
		{
			var loadingNode = node.findChild( 'isDummy', true );

			if( loadingNode != null )
				node.removeChild(loadingNode);
		}
						
		parent = node;
		if(l == 0)
			top = node;
    }
    
    // and now issue a request for the ontology hit counts for these new nodes
	if(top != null )
    {
		requestHitCountForOntologyTerms( { isOneOff: true, tree: tree, startNode: top, dataSourceName: selectedDataSourceName } );
    }
	
	// Ensure the added bottom node is visible
	if(parent != null)
	{
		parent.ensureVisible( function() { parent.getOwnerTree().getSelectionModel().select(parent, null, true); } );
	}
}

function expandOntologyNode( name, node )
{
    var url = 'database-ontology-lookup.php?ont=' + name;

    if( node.parentNode != null )
    {
	url += ( '&term=' + encodeURIComponent( node.attributes[ 'termName' ] ) );
    }

    Ext.Ajax.request( { url: url,
		        callback: addNodesToTree,
		        method: 'GET',
		        node: node } );
}

function expandHierarchyToNode( name, term )
{
    var url = 'database-ontology-parent-lookup.php?ont=' + name;
	url += ( '&term=' + encodeURIComponent( term ) );

    Ext.Ajax.request( { url: url,
		        callback: addHierarchyToTree,
		        method: 'GET',
				ont: name } );
}

// ===============================================================================================
// popup info viewer

function displayInfoWindow()
{
    if( infoWindow == null )
    {
	infoWindow = new Ext.Window( { applyTo:'infoWindow',
				       layout:'fit',
				       width:500,
				       height:300,
				       closeAction:'hide',
				       plain: true,
				       
				       items: new Ext.TabPanel({
					   applyTo: 'hello-tabs',
					   autoTabs:true,
					   activeTab:0,
					   deferredRender:false,
					   border:false
					   }),
				       
				       buttons: [{ text:'Submit',
						   disabled:true },
                                                 { text: 'Close',
						   handler: function(){ infoWindow.hide(); }
                                                 } ]
                                     } );
    }
    infoWindow.show(this);
}

function populateInfoWindow( dataSource, id )
{
    
}


// ===============================================================================================
// browsage

function requestDataSourceBrowse( )
{
    if ( selectedDataSourceName == null )
    {
	alert( "tried to browse but no data source selected" );
    }
    else
    {
	// if we've not previously accessed  the columnn meta-data, do so now,
	
	if( gridPanel[ selectedDataSourceName ] == null )
	{
	    Ext.Ajax.request( { url: 'database-describe-source.php?name=' + encodeURIComponent( selectedDataSourceName ),
			        callback: configureGridView,
			        method: 'GET',
			        activeDataSource: selectedDataSourceName } );
	}
	else
	{
	    // otherwise, we've already got a grid set up, so we go straight to the data loading phase
	    
	    populateGrid( selectedDataSourceName );
	}
    }
}

// receive the column meta-data description and build a GridPanel to match
//
function configureGridView( options, wasSuccess, response )
{
    if( ! wasSuccess )
    {
	alert( "Server not responding. Please try again later." );
	return;
    }

    var dataSourceName = options.activeDataSource;

    // the description comes with one column described on each line; "column name" "\t" "column description" "\t" "max width"

    var infoLines = response.responseText.split( "\n" );
    
    var columnDetails = [];

    var columnList = [];
	var idcol = -1;
    for( var i = 0; i < infoLines.length; i++ )
    {
	if( trim10( infoLines[ i ] ).length > 0 )
	{
	    var bits = infoLines[ i ].split( "\t" );
	    
	    var columnName  = bits[ 0 ];
		if(columnName == 'id')
			idcol = i;
	    var columnDesc = bits[ 1 ];
	    var columnWidth = bits[ 2 ];
	    
	    var isHidden = ( columnWidth == '0' );

	    columnDetails.push( { header: columnDesc,
			          dataIndex: columnName,
			          sortable: false,
			          hidden: isHidden,
			          width: ( columnWidth * 0.5 ) } );
	    
	    columnList.push( { name: columnName, mapping: columnName } );
	}
    }
    
    var columnModel = new Ext.grid.ColumnModel( columnDetails );
    
    columnModel.defaultSortable = false;
    
    // install a custom renderer in column one
    //
	if(idcol >= 0)
	{
		columnModel.setRenderer(idcol, function( value, metadata, record, rowIndex, colIndex, store ) 
					 { 
						var url = record.get('url');
						if(url == null)
						{	
							return value;
						}
						else
							return '<A TARGET="_blank" HREF="' + record.get('url') + '">' + value + '</A>';
					 } );
	}

    // alert( "expecting " + columnDetails.length + " columns" );

    var rowProxy = new Ext.data.HttpProxy ( { url: 'database-lookup.php' } );
    
    //  install a custom function to tweak the params for the request (to pass in our query params)
    //
    rowProxy.on( 'beforeload', function( p, params ) { params = configureBrowseParams( params ); } );
    
    var reader = new Ext.data.JsonReader( { root: 'rows', totalProperty: 'totalResults' },  columnList );

    var rowStore = new Ext.data.Store( { proxy: rowProxy, reader: reader } );

     //  install a custom function to tweak the params for the request (to pass in our query params)
    //
    rowStore.on( 'datachanged', function( theStore ) 
		 {
		     // alert( 'data changed! (size:' + gridPanel.store.totalLength + ')' );
		     
		     var relevantTab = tabPanel.find( 'dataSourceName',  dataSourceName );  // how do we find the current tab??!?!?
		     
		     var description = ( theStore.totalLength > 0 ) ? ( pluralise( 'hit', 'hits', theStore.totalLength ) ) : 'no hits';
	
		     relevantTab[ 0 ].setTitle( relevantTab[0].dataSourceTitle + ' <I>(' +  description + ')</I>' );
		     //relevantTab[ 0 ].setTitle( tabPanel.activeTab + ' <I>(' +  description + ')</I>' );
		 } );
     
    // create a new GridPanel
    //
    gridPanel[ dataSourceName ] = new Ext.grid.GridPanel(
	{
          store: rowStore,
          colModel: columnModel,
	
	  viewConfig: { autoFill: true /*forceFit: true*/ },

          enableColLock:false,

	  frame: false,
	  border: true,

	  region: 'center',
	  split: false,

	  collapsible: false,	
	  margins: '3 3 3 3',

 	  
	  autoHeight: true,

	  autoWidth:true
	} );
 

    // and put the GridPanel it into the correct tab of the TabPanel
    //
    var relevantTab = tabPanel.find( 'dataSourceName',  dataSourceName );

    relevantTab[ 0 ].add( gridPanel[ dataSourceName ] );

    tabPanel.doLayout();

    // add a double-click listener so we can handle the "what on earth is this?" question
    //
    gridPanel[ dataSourceName ].on( 'rowdblclick', function( grid, rowIndex, eventData )
				    {
					// display a pop-up window with information about the hits for this entry
					setBusy(true);
					displayInfoAbout( grid, grid.getStore().getAt( rowIndex ).get( 'id' ), grid.getStore().getAt( rowIndex ).get( 'Tab' ) );

				    } );
    

    // and do the loadings
    //
    populateGrid( dataSourceName );

}

function populateGrid( dataSourceName )
{
    var rowStore = gridPanel[ dataSourceName ].getStore();

    // connect the paging toolbar to the right data store
    //
    pagingBar.bindStore( rowStore );

    // and request a load
    //
    rowStore.load();

    // now we have these results, get the counts for the other data sources...
    //
    requestHitCountForUnselectedSources( null );

}

function startQuery()
{
    configureConstraintToolbar();

    setBusy( true );

    resetHitCountsForOntologyTerms();

    resetHitCountsForAllSources();
    
    requestDataSourceBrowse();
}

function configureConstraintToolbar()
{
    // var debugInfo = '';

    for( var o = 0; o < ontoName.length; o++ )
    {
	var ontology = ontoName[ o ];

	if( selectedTerm[ ontology ] != null )
	{
	    //debugInfo += '[' + ontology + ':' + selectedTerm[ ontology ] + ']';

	    var buttonText = '"';

	    for( var t = 0; t < selectedTerm[ ontology ].length; t++ )
	    {
		if( t > 0 )
		{
		    buttonText += '<SPAN STYLE="font-size:75%;padding:4px;color:#447">AND</SPAN>';
		}

		buttonText += selectedTerm[ ontology ][ t ];
	    }

	    buttonText += '" (' + ontoLongName[ o ] + ')';

	    if( removeButton[ ontology ] == null )
	    {
		removeButton[ ontology ] = new Ext.Toolbar.Button( { ontology: ontology,  
								     text: buttonText,
								     handler: function() { clearOntologySelection( this.initialConfig.ontology ); 
											   startQuery(); },
								     tooltip: 'Press this button to remove<br/>this constraint from the query',
								     style: 'padding-left:10px;padding-right:10px', 
								     cls:'x-btn-text-icon',
								     icon:'images/killIcon.png',
								     iconAlign: 'right' } );

		queryToolbar.add( removeButton[ ontology ] );

		queryToolbar.doLayout();
	    }
	    else
	    {
		removeButton[ ontology ].setText( buttonText );
	    }
	}
	else
	{
	    //debugInfo += '[' + ontology + ':---]';
	}
    }

    // how many filter terms are in play?
    var activeTerms = 0;

    for( var o = 0; o < ontoName.length; o++ )
    {
	if( removeButton[ ontoName[ o ] ] != null )
	{
	    activeTerms++;
	}
    }
 
    //alert( 'configureConstraintToolbar: ' + debugInfo + ' activeTerms:' + activeTerms );
 
    // hide or show the query tool bar as required

    if( activeTerms > 0  )
    {
	if( queryToolbar.isVisible() == false )
	{
	    queryToolbar.show();
	    viewport.doLayout();
	}
    }
    else
    {
	if( queryToolbar.isVisible() )
	{
	    queryToolbar.hide();
	    viewport.doLayout();
	}
    }
}


function clearOntologySelection( ontology )
{
    //alert( 'clearOntologySelection: ' + ontology );

    selectedTerm[ ontology ] = null;
    
    // empty the combobox
    var comboBoxen = ontoBrowser[ ontology ].find( 'ontology', ontology );
    comboBoxen[ 0 ].clearValue(); 
    
    // remove the button
    if( removeButton[ ontology ] != null )
    {
	// alert( 'removing button for ' + ontology );

	queryToolbar.remove( removeButton[ ontology ] );
	queryToolbar.doLayout();

	removeButton[ ontology ].destroy();
	removeButton[ ontology ] = null;

	
    }

    // deselect any node in the tree
    ontoTree[ ontology ].getSelectionModel().clearSelections();
}



function configureBrowseParams( params )
{
    params.ds    = selectedDataSourceName;   // the DataSource
    params.limit = gridPageSize;             // the page size
    
    // the start item will be configured automatically by the PagingToolbar

    // check each ontology and add a filter if there is a selection

    for( var o = 0; o < ontoName.length; o++ )
    {
	if( selectedTerm[ ontoName[ o ] ] != null )
	{
	    for( var t = 0; t < selectedTerm[ ontoName[ o ] ].length; t++ )
	    {
		var paramName = ontoName[ o ] + '_' + t;

		params[ paramName ] = selectedTerm[ ontoName[ o ] ][ t ];

		//	alert( 'configureBrowseParams:' + paramName + '=' +  selectedTerm[ ontoName[ o ] ][ t ] );
	    }

	}
    }

    return params;
}

// ===============================================================================================
// hit counts for the unselected data sources

function resetHitCountsForAllSources()
{
    for( var i = 0; i < dataSourceNameList.length; i++ )
    {
	var relevantTab = tabPanel.find( 'dataSourceName',  dataSourceNameList[ i ] );
	
	if (relevantTab[ 0 ] != null )
	{
	    relevantTab[ 0 ].setTitle( dataSourceTitleList[ i ] );
	}
    }

    //alert("all names reset");
}

function requestHitCountForUnselectedSources( requestState )
{
    if( requestState == null )
    {
	requestState = { searchIndex: 0 };
    }
    
    var candidateSourceName = dataSourceNameList[ requestState.searchIndex ];

    if( candidateSourceName != selectedDataSourceName )
    {
	var queryUrl = 'database-lookup.php?ds=' + candidateSourceName + '&count=true';
	
	// add ontology filters...

	for( var o = 0; o < ontoName.length; o++ )
	{
	    if( selectedTerm[ ontoName[ o ] ] != null )
	    {
		queryUrl += '&' + makeOntologyQueryParams( ontoName[ o ] );
	    }
	}
	
	//alert( 'requestHitCountForUnselectedSources: url=' + queryUrl );
	
	// and call counter service

	Ext.Ajax.request( { url: queryUrl,
		            callback: handleHitCountForUnselectedSources,
		            method: 'POST',
		            requestState: requestState } );
    }
    else
    {
	// skip this one..

	requestState.searchIndex++;
	requestHitCountForUnselectedSources( requestState );
    }
    
    
}
 
function handleHitCountForUnselectedSources( options, wasSuccess, response )
{
    if( ! wasSuccess )
    {
	alert( "Server not responding. Please try again later." );
	return;
    }

    // alert( 'result for ' + dataSourceNameList[ requestState.searchIndex ] + ' is ' + result );
     
     // change the text of the associated tab

    var relevantTab = tabPanel.find( 'dataSourceName',  dataSourceNameList[ options.requestState.searchIndex ] );

     if( relevantTab[ 0 ] != null )
     {
	 var count = response.responseText;

	 var description = ( count > 0 ) ? ( pluralise( 'hit', 'hits', count ) ) : 'no hits';
	 
	 relevantTab[ 0 ].setTitle( dataSourceTitleList[ options.requestState.searchIndex ] + '  <I>(' +  description + ')</I>' );
     }
     

    // and possibly move on to the next one...
    
    options.requestState.searchIndex++;
    
    if( options.requestState.searchIndex < dataSourceNameList.length )
    {
	requestHitCountForUnselectedSources( options.requestState );
    }
    else
    {
	// we've done all of the sources, now start requesting the counts for the ontologies

	requestHitCountForOntologyTerms( null );
    }
}




// ===============================================================================================
// demonstration searches

function runDemoSearch( selection )
{
    for( var o = 0; o < ontoName.length; o++ )
    {
	if( ( selection[ ontoName[ o ] ] == null ) || ( selection[ ontoName[ o ] ] == 'undefined' ) )
	{
	    clearOntologySelection( ontoName[ o ] );
	}
	else
	{
	    var node = findChildRecursively( ontoTree[ ontoName[ o ] ].getRootNode(), 'termName', selection[ ontoName[ o ] ] );
	    
	    if( node != null )
	    {
		node.ensureVisible( function() { node.select(); } );
	    }
	    
	    selectedTerm[ ontoName[ o ] ] = selection[ ontoName[ o ] ];
	}
    }
    
    startQuery();
}


// ===============================================================================================
// hit counts for the visible nodes in the ontology trees

function resetHitCountsForOntologyTerms( )
{
    for( var o = 0; o < ontoName.length; o++ )
    {
	resetHitCountsForTreeNode( ontoTree[ ontoName[ o ] ].getRootNode() );
    }
}


function resetHitCountsForTreeNode( node )
{
	if( typeof( node['isDummy'] != undefined ) )
	{
		node.attributes[ 'hitCount' ] = 0;
		node.setText( node.attributes[ 'termName' ] );
	}

    var childNodes = node.childNodes;
    
    if( childNodes != null )
    {
		for(var i = 0, len = childNodes.length; i < len; i++) 
		{
			resetHitCountsForTreeNode( childNodes[ i ] );
		}
    }
}

function makeOntologyQueryParams( ontologyName )
{
    var result = '';

    for( var t = 0; t < selectedTerm[ ontologyName ].length; t++ )
    {
	if( t > 0 )
	{
	    result += "&";
	}

	result += ( ontologyName + '_' + t ) + "=";  // param name
	
	result += encodeURIComponent( selectedTerm[ ontologyName ][ t ] );   // param value
    }

    return result;
}


function requestHitCountForOntologyTerms( requestState )
{
    if( requestState == null ) // this is the first of a sequence of calls, set things up...
    {
	requestState = { isOneOff: false,                            // set to true when we are just looking for the results for a specific node
			 tree: firstTree,                            // start at first tree
			 dataSourceName: selectedDataSourceName };   // operate assuming currently selected data source
    }
    
    //alert( 'requestHitCountForOntologyTerms: at ' + requestState.tree[ 'ontologyName' ] + '...' );

    // unless we have instructions to the contrary, we start searching at the root of the ontology tree

    if( requestState.isOneOff == false )
    {
	requestState.startNode = requestState.tree.getRootNode();
    }

    var queryUrl = 'database-ontology-hit-counter.php?ont=' + requestState.tree[ 'ontologyName' ] + '&ds=' + requestState.dataSourceName;

    // add ontology filters; but if we have a selection active in this tree, then leave off the filter 
    
    for( var o = 0; o < ontoName.length; o++ )
    {
	if( selectedTerm[ ontoName[ o ] ] != null )
	{
		queryUrl += '&' + makeOntologyQueryParams( ontoName[ o ] ) ;
	}
    }

    // and provide a list of the visible terms in the POST body 

    var listOfTerms = [];

	listOfTerms = recursivelyGetVisibleTerms( requestState.startNode );

    Ext.Ajax.request( { url: queryUrl,
		        callback: handleHitCountForOntologyTerms,
		        method: 'POST',
		        jsonData: listOfTerms,
		        requestState: requestState } );
	
}

function handleHitCountForOntologyTerms( options, wasSuccess, response )
{
    if( ! wasSuccess )
    {
	alert( "Server not responding. Please try again later." );
	return;
    }

    // alert( 'handleHitCountForOntologyTerms.result for ' + dataSourceNameList[ requestState.ontIndex ] + ' is:\n' + result );
    
    // the response is zero or more lines of term names with their hits counts
    
    var lines = response.responseText.split( "\n" );
    
    var termCount = [];

    for( var l = 0; l < lines.length; l++ )
    {
	var columns = lines[ l ].split( "\t" );
	
	if( columns.length == 2 )
	{
	    termCount[ columns[ 0 ] ] = parseInt( columns[ 1 ] );     // how about using |0 instead?
	}
    }
    
    // set these values into the right tree

    setCountsInTree( options.requestState.startNode, termCount );

    // and possibly do the next one...

    if( options.requestState.isOneOff == false )
    {
	options.requestState.tree = options.requestState.tree.nextTree;
	
	if( options.requestState.tree != null )
	{
	    // start at next one

	    requestHitCountForOntologyTerms( options.requestState );
	}
	else
	{
	    // else we've done all of the trees... we can have a nice lie down

	    setBusy( false );
	}


    }
}

function setCountsInTree( node, countLookup )
{
	if( typeof( node['isDummy'] != undefined ) )
	{
		var termName = node.attributes[ 'termName' ];
		
		// if countLookup is null, then use the default hitCounts that get supplied as part of the tree data
		
		var hitCount = countLookup[ termName ];  // can be 'undefined' if no hits for this term
		
		// we need to store the hits counts so they can be retrieved when we expand nodes...
		
		if ( typeof( hitCount ) != 'undefined' )  // i.e. zero
		{
			node.attributes[ 'hitCount' ] = hitCount;
		}
		
		if( node.attributes[ 'hitCount' ] > 0 )
		{
			node.setText( '<B>' + termName + '</B> (' + node.attributes[ 'hitCount' ] + ')' );
		}
		else
		{
			node.setText( termName );
		}
	}
    else
    {
		node.setText( "<I>loading...</I>" );
    }

    // and recurse

    var childNodes = node.childNodes;
    
    if( childNodes != null )
    {
	for(var i = 0, len = childNodes.length; i < len; i++) 
	{
	    setCountsInTree( childNodes[ i ], countLookup );
	}
    }

}

function recursivelyGetVisibleTerms( node )
{
    if( node == null )  // why is this happening?
    {
	return;
    }

    var result = node.attributes[ 'termName' ];

    if( typeof( result ) == 'undefined' ) // some nodes are not ones that we created....
    {
	result = '';
    }
    else
    {
	result += '\n';
    }

	var childNodes = node.childNodes;
	
	if( childNodes != null )
	{
	    for(var i = 0, len = childNodes.length; i < len; i++) 
	    {
			result += recursivelyGetVisibleTerms( childNodes[ i ] );
	    }
	}

    return result;
}


function displayInfoAbout( grid, id, dsTitle )
{
    var queryUrl = 'database-item-lookup.php?ds=' + selectedDataSourceName + '&id=' + encodeURIComponent( id );
    
    //alert( queryUrl );

    Ext.Ajax.request( { url: queryUrl,
		        callback: handleInfoRequest,
		        method: 'GET',
				targetId: id,
				dsTitle: dsTitle,
		        sourceGrid: grid } );
}

function handleInfoRequest( options, wasSuccess, response )
{
    if( ! wasSuccess )
    {
		alert( "Server not responding. Please try again later." );
		return;
    }

    //
    // the response text is a bunch of 'paths' of the form:
    //    ONTOLOGY_SHORT_NAME \t TERM_NAME \t PARENT \t GRANDPARENT \t GREATGRANDPARENT \t .... \t ROOT_TERM \n
    //
    // convert it into some HTMLs
    //
    // we'll put the paths into columns, one table for each ontology

    var htmlStore = {};
	var htmlSelectedStore = {};
	
    var lines = response.responseText.split( "\n" );
    
    var termCount = [];

    var indentPerStep = 12;
    var iconWidth = 8;

    for( var l = 0; l < lines.length; l++ )
    {
		var columns = lines[ l ].split( "\t" );
		
		if( columns.length > 0 )
		{
			var ontologyShortName = columns[ 0 ];
			var matchedTerm = columns[ 1 ];
			var keywords = columns[ 2 ];
			var fullsentence = columns[ 3 ];

			var htmlContent = htmlStore[ ontologyShortName ];
			if( htmlContent == null )
				htmlContent = '';

			var htmlSelectedContent = htmlSelectedStore[ ontologyShortName ];
			if( htmlSelectedContent == null )
				htmlSelectedContent = '';

			var firstIndex = 4;
			var lastIndex = columns.length - 1;
			var hasSelectedTerm = false;
			var htmlString = '';
			
			for( var t = firstIndex; t <= lastIndex; t += 2 )
			{
				var depth = parseInt(columns[t+1]);
				var stepOffset = depth * indentPerStep;
				var textOffset = stepOffset + iconWidth;
				
				var className = 'infoWindowOntologyTerm';

				if(t == firstIndex)
				{
					htmlString += '<TR height="10px"><TD></TD></TR><TR><TD CLASS="infoWindowOntologyKeywords">"<i>' + keywords + '</i>"</TD></TR>';
					if(fullsentence != null && fullsentence != '')
						htmlString += '<TR height="10px"><TD></TD></TR><TR><TD CLASS="infoWindowOntologyFullSentence">' + fullsentence + '</TD></TR>';
					htmlString += '<TR height="10px"><TD></TD></TR>';
				}
				
				if( columns[t] == matchedTerm )  // matched item
					className += ' infoWindowOntologyMatchedTerm';
				
				if( t > firstIndex )  // everything after 1st item gets the icon
					className += ' infoWindowOntologyNonRootTerm';
				
				if( selectedTerm[ontologyShortName] != null )
				{
					for( var c = 0; c < selectedTerm[ontologyShortName].length; c++ )
					{
						if(selectedTerm[ontologyShortName][c] == columns[t])
						{
							className += ' infoWindowOntologySelectedTerm';
							hasSelectedTerm = true;
							break;
						}
					}
				}
				
				htmlString += '<TR><TD STYLE="padding-left:' + textOffset + 'px; background-position: ' + stepOffset + 'px 0px" CLASS="' + className + '">' + columns[ t ] + '</TD></TR>';
			}

			if(hasSelectedTerm)
				htmlSelectedStore[ ontologyShortName ] = htmlSelectedContent + htmlString;  // and store for next time...			
			else
				htmlStore[ ontologyShortName ] = htmlContent + htmlString;  // and store for next time...
		}
    }

    var tabList = []; // build the list of per-ontology tab def'ns in here

    for( var o = 0; o < ontoName.length; o++ )
    {
		var htmlContent = htmlStore[ ontoName[ o ] ];
		var htmlSelectedContent = htmlSelectedStore[ ontoName[ o ] ];

		if(htmlContent == null && htmlSelectedContent == null)
			continue;
			
		var finalHtml = '<TABLE>';// Opening phrase
		
		// Selected first
		if( htmlSelectedContent != null )
			finalHtml += htmlSelectedContent;		
		// And the rest...
		if( htmlContent != null )
			finalHtml += htmlContent;
			
		finalHtml += '</TABLE>';// Closing phrase
		
		tabList.push( { title: ontoShortNameToLongName( ontoName[ o ] ),
				autoScroll: true,
				html: finalHtml } );
    }

	var sourceTitle = options.dsTitle;
	if(sourceTitle == null)
	{
		var relevantTab = tabPanel.find( 'dataSourceName',  selectedDataSourceName );
		sourceTitle = relevantTab[0].dataSourceTitle;
	}

    var infoWin = new Ext.Window( { title: 'Information for "' + sourceTitle + '" item <i>' + options.targetId + '</i>',
				    layout:'fit',
				    width:700,
				    height:500,
				    plain: true,
				    items: new Ext.TabPanel( { activeTab: 0,
							       items: tabList } ) } );
    
    infoWin.show( options.grid ); // ::TODO:: map it to particular grid coords so it zooms out from the mouse?
	setBusy(false);
}
