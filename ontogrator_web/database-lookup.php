<?php

// All code is copyright the Natural Environment Research Council and University of Manchester
// Released under GPLv3 - see LICENCE file for details.

include_once( 'config.php' );

include_once( 'common.php' );

require_once 'MDB2.php';


function escape_quotes( $input )
{
  //return str_replace( '"', '\\"', $input );

  return str_replace( '"', '\\"', preg_replace( "/\\xB0/", "&deg;", $input ) );
}



$database_connection =& MDB2::connect( DB_SYSTEM_DSN . "/" . DATABASE_NAME );
$database_connection->query("SET NAMES utf8");

if ( PEAR::isError( $database_connection ) )  
  {
    die( $database_connection->getMessage() );
  }

if( isset( $_REQUEST[ 'ds' ] ) === false )
  {
    die( 'Data source not specified' );
  }

$data_source = strtoupper( $_REQUEST[ 'ds' ] );

$columns = null;


foreach( $data_source_infos as $key => $info )
  {
    if( $data_source == $key )
      {
	$columns = $info[ 'columns' ];
      }
  }

if( $columns == null )
  {
    die( 'Unrecognised data source "' . $data_source . '"' );
  }


//
// for big datasets (e.g. SILVA) we dont want to have to pull over all of the results
// to do the counting - so we do the count first, then use "LIMIT offset,count" to 
// select just the required subset of rows
//


// the 'count' mode just returns the number of hits, rather than the hits themselves
$count_only = isset( $_REQUEST[ 'count' ] );

$ontology_terms = get_ontology_terms();

$page_size = isset( $_REQUEST[ 'limit' ] ) ? $_REQUEST[ 'limit' ] : 10;

$start_row = isset( $_REQUEST[ 'start' ] ) ? ( $_REQUEST[ 'start' ] + 1 ) : 1;       // extJS uses 0 based counting


// from FROM and WHERE clauses are common to both queries, so we'll
// build that bit first

// ::TODO:: generic'ise this

$shared_sql = ' FROM ' . $data_source . '_entry t';
$where_sql = ' WHERE ';
$needsAnd = false;
$isblank = true;

foreach( $ontology_terms as $ontology_short_name => $ontology_info )
{
	$i = 1;
	foreach( $ontology_terms[ $ontology_short_name ] as $selval )
	{
		// SELECT clause
		$shared_sql .= ',' . $data_source . '_' . $ontology_short_name . '_hit ' . $ontology_short_name . $i;

		// WHERE clause
		if( $needsAnd )
		{
			$where_sql .= ' AND ';
		}
		$where_sql .= 't.id=' . $ontology_short_name . $i . '.id AND ' . $ontology_short_name . $i . '.name=' . $database_connection->quote( $selval, 'text' );
		$needsAnd = true;
		
		$isblank = false;
		
		// Increment id counter
		$i = $i + 1;
	}
}

if(!$isblank)
{
	$shared_sql .= $where_sql;
}

//echo "<P>" . DB_SYSTEM_DSN . "/" . DATABASE_NAME . "</P>";
//
//echo "<P>" . $sql . "</P>";


// 1. firstly, do the count...

$sql = 'SELECT COUNT(DISTINCT t.id) ' . $shared_sql;

//echo "<P>1. " . $sql . "</P>";


$result = $database_connection->query( $sql );

if ( PEAR::isError( $result ) )  
  {
    die( "!! - " . $result->getMessage() );
  }

while ( ( $row = $result->fetchRow() ) )  
  {
    $total_rows = $row[ 0 ];

    if( $count_only )
      {
	echo $total_rows;   // should just be a single row containing a single number
      }
  }

$result->free();
    
if( $count_only )
  {
    $database_connection->disconnect();

    exit( 1 );
  }

// now we do the query again, this time with the LIMIT set accordingly

$sql = 'SELECT ';
$pos = 0;
foreach( $columns as $name => $colinfo )
  {
	if($pos > 0)
		$sql .= ',';
		
	if($name == 'Tab')
	{
		$tabnumber = 0;
		$description = 'CASE Tab';
		foreach( $data_source_infos as $key => $info )
		{
			$description .= ' WHEN ' . $tabnumber++ . ' THEN \'' . $data_source_infos[ $key ][ 'description' ] . '\'';
		}
		$description .= ' END';
		  
		$sql .= $description . ' AS `Tab`';
	}
	else
	{
		$sql .= 't.' . $name;
	}
	
	$pos++;
  }

$sql .= ' ' . $shared_sql . ' LIMIT ' . ($start_row - 1) . ',' . $page_size;

//echo "<P>2. " . $sql . "</P>";

echo '{ rows: [ ';
echo "\n";

$result = $database_connection->query( $sql );

$count = 0;

//echo "<P>NumRows:" . $result->numRows() . "</P>";

while ( ( $row = $result->fetchRow() ) )  
  {
    if( $count > 0 ) 
      { 
	echo ",\n";
      }
    
    $pos = 0;
    
	foreach( $columns as $name => $colinfo )
	{
		if($pos == 0)
			echo "{\n" . $name . ': "' . escape_quotes( $row[ $pos ] ) . '"';
		else
			echo ",\n" . $name . ': "' . escape_quotes( $row[ $pos ] ) . '"';	
		$pos++;
	}
    
    echo "\n}";
    
    $count++;
  }

    
echo " ],\ntotalResults:" . ( $total_rows ). ",\nresultsReturned:" . $count . ",\nfirstResult:" . $start_row . "\n}";

//echo "<DIV>";
//var_dump( $result );
//echo "</DIV>";

$result->free();

$database_connection->disconnect();

?>
