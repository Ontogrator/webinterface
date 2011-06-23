<?php

/*
  interface:

  
  lookup.php?ont=Gaz

     -> does nothing

  lookup.php?ont=Gaz&term=[x]

     -> returns all parents of node [x] for Gaz up to root


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
$term_name = $_GET[ 'term' ];

$sql = 
  'SELECT DISTINCT parent, depth, child_count' . 
  ' FROM ' . $ontology_short_name . '_hierarchy' .
  ' WHERE name=? ORDER BY lft, depth';

$prepared_statement =  $database_connection->prepare( $sql );

if ( PEAR::isError( $prepared_statement ) )  
{
	die( "!! - " . $prepared_statement->getMessage() );
}

$result = $prepared_statement->execute( array( $term_name ) );

if ( PEAR::isError( $result ) )  
  {
    die( "!! - " . $result->getMessage() );
  }

while ( ( $row = $result->fetchRow() ) )  
  {
    $term = $row[ 0 ];
    $depth = $row[ 1 ];
    $childCount = $row[ 2 ];

    echo ( $childCount > 0 ) ? '1' : '0';
    echo "\t" . $term;
	echo "\t" . $depth . "\n";
	
	if($term == $term_name)
		break;
  }

$result->free();

$database_connection->disconnect();

?>
