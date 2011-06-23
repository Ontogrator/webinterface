<?php

// REMEMBER! The javascript file "ontogrator.js" also contains configuration!

// ============ General configuration ========================

// Put the DB name here
define( "DATABASE_NAME", "ontogrator" );
// Put the DB string here
define( "DB_SYSTEM_DSN", "mysql://ontogrator@localhost" );

// ============ Pane names ========================

// Just use PANE01, PANE02, PANE03, PANE04, etc to be generic - limited to 4 at the moment
// The lookup array is required for each pane, but the contents (e.g. "terminizer", "annotator", "manual")
// are for information only, nothing is actually computed based on these values
$ontology_infos = array( "PANE01" => array( "lookup" => "terminizer" ), 
			 "PANE02" => array( "lookup" => "annotator" ),
			 "PANE03" => array( "lookup" => "terminizer" ),
			 "PANE04" => array( "lookup" => "manual" ));
			 
// ============ Tabs and associated display arguments ========================
	 
// Just use TAB01, TAB02, TAB03, TAB04, etc to be generic - no known limit to these
$data_source_infos = array (
"ALLTAB" => array(	"description" => "All",  
		"columns" => array( "Tab" => array("Source" => 2),
							"id" => array ("Document ID" => 2),
							"url" => array ("Url" => 0),
							"Links" => array ("Alternative ID" => 2),
							"Title" => array ("Document Title" => 12),
							"Authors" => array ("Authors/Officials" => 6 ) ) ),

"TAB01" => array(	"description" => "PubMed",  
		"columns" => array( "id" => array ("Document ID" => 2),
							"url" => array ("Url" => 0),
							"Links" => array ("Alternative ID" => 2),
							"Title" => array ("Document Title" => 12),
							"Authors" => array ("Authors" => 6 ) ) ),

"TAB02" => array(	"description" => "Pubget", 
		"columns" => array( "id" => array ("Document ID" => 2),
							"url" => array ("Url" => 0),
							"Links" => array ("Alternative ID" => 2),
							"Title" => array ("Document Title" => 12),
							"Authors" => array ("Authors" => 6 ) ) ),

"TAB03" => array(	"description" => "ClinicalTrials.gov", 
		"columns" => array( "id" => array ("Study ID" => 2),
							"url" => array ("Url" => 0),
							"Links" => array ("Alternative ID" => 2),
							"Title" => array ("Study Title" => 12),
							"Authors" => array ("Officials" => 6 ) ) )
);

?>
