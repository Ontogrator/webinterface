<?php

/*
  interface:

  
  database-ontology-search.php?ont=Gaz&part=[x]

     = returns all terms from Gaz which match [x]

     [x] must be at least 3 characters

 */

include_once( 'config.php' );

require_once 'MDB2.php';

$database_connection =& MDB2::connect( DB_SYSTEM_DSN . "/" . DATABASE_NAME );

if ( PEAR::isError( $database_connection ) )  
  {
    die( $database_connection->getMessage() );
  }


$table = null;

if( isset( $_POST[ 'ont' ] ) == false )
  {
    die( '!! - no ontology selector' );
  }

$ontology_short_name = $_POST[ 'ont' ];

if( isset( $_POST[ 'part' ] ) == false )
  {
    die( '!! - no partial term' );
  }

if( strlen( $_POST[ 'part' ] ) < 3 )
  {
    die( '!! - partial term must be at least 3 characters long' );
  }


$sql = 'SELECT DISTINCT name FROM ' . $ontology_short_name . '_synonyms WHERE synonym LIKE ? ORDER BY name';

//echo $sql;

$prepared_statement =  $database_connection->prepare( $sql );

if ( PEAR::isError( $prepared_statement ) )  
  {
    die( "!! - " . $prepared_statement->getMessage() );
  }

$result = $prepared_statement->execute( array( '%' . $_POST[ 'part' ] . '%' ) );

if ( PEAR::isError( $result ) )  
  {
    die( "!! - " . $result->getMessage() );
  }

// we return the results in JSON format to make it easy to parse in ExtJS

echo '{ results: 1, terms: [ ';
echo "\n";

$first = true;

while ( ( $row = $result->fetchRow() ) )  
  {
    if( ! $first ) 
      { 
	echo ",\n";
      }
    
    echo '{ term:\'' . $row[ 0 ] . "'}";

    $first = false;
  }
echo ' ] }';

$result->free();

$database_connection->disconnect();

?>
