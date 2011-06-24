<?php

// All code is copyright the Natural Environment Research Council and University of Manchester
// Released under GPLv3 - see LICENCE file for details.

/*
  interface:

  
  lookup.php?ont=Gaz

     -> returns all root nodes for Gaz

  lookup.php?ont=Gaz&term=[x]

     -> returns all children of node [x] for Gaz


  in each case, the result is one term per line,
  terms which are known to have children will be prefixed with "+", terms without children will be prefixed with "="
 */

include_once( 'config.php' );

require_once 'MDB2.php';

$database_connection =& MDB2::connect( DB_SYSTEM_DSN . "/" . DATABASE_NAME );

if ( PEAR::isError( $database_connection ) )  
  {
    die( $database_connection->getMessage() );
  }


$table = null;

if( isset( $_GET[ 'ont' ] ) == false )
  {
    die( '!! - no ontology selector' );
  }

$ontology_short_name = $_GET[ 'ont' ];

/*
  before we have the child_counts available, we did this:

   SELECT EP1.name, count(EP2.name) 
          FROM ENVO_parent AS EP1 
          LEFT JOIN ENVO_parent AS EP2 
          ON EP2.parent=EP1.name 
          WHERE EP1.parent='fruit' 
          GROUP BY EP1.name;

   now we don't need to...
*/


if( isset( $_GET[ 'term' ] ) )
  {
    $sql = 
      'SELECT DISTINCT ' . $ontology_short_name . '_term.name, ' . $ontology_short_name . '_term.child_count ' . 
      ' FROM ' . $ontology_short_name . '_term, ' . $ontology_short_name . '_parent ' .
      ' WHERE parent=? AND ' . $ontology_short_name . '_term.name = ' . $ontology_short_name . '_parent.name';

    // echo $sql;

    $prepared_statement =  $database_connection->prepare( $sql );

    if ( PEAR::isError( $prepared_statement ) )  
      {
	die( "!! - " . $prepared_statement->getMessage() );
      }

    $result = $prepared_statement->execute( array( $_GET[ 'term' ] ) );
  }
else
  {
    // find all nodes which don't have a parent

	$result = $database_connection->query( 'SELECT DISTINCT name,child_count FROM ' . $ontology_short_name . '_term WHERE parent_count=0 ORDER BY name' );
  }

if ( PEAR::isError( $result ) )  
  {
    die( "!! - " . $result->getMessage() );
  }

while ( ( $row = $result->fetchRow() ) )  
  {
    $term = $row[ 0 ];
    $childCount = $row[ 1 ];

    echo ( $childCount > 0 ) ? '1' : '0';
    
    echo "\t" . $term . "\n";
  }

$result->free();

$database_connection->disconnect();

?>
