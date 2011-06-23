<?php

//
// provides details of the hits for a specific item
//

include_once( 'config.php' );

require_once 'MDB2.php';

$database_connection =& MDB2::connect( DB_SYSTEM_DSN . "/" . DATABASE_NAME );

if ( PEAR::isError( $database_connection ) )  
{
	die( $database_connection->getMessage() );
}

if( isset( $_REQUEST[ 'ds' ] ) === false )
{
	die( 'Data source not specified' );
}

if( isset( $_REQUEST[ 'id' ] ) === false )
{
	die( 'ID not specified' );
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

// for each ontology, get the hits against this item
// and then arrange those hits into the parentage hierarchy
//
//
// remember some items can have multiple parents,
//
// this hash-of-hashes will be filled with: one set of 'term => [parent1, parent2, .... ]'  for each ontology
//

$hierstr = "";

foreach( $ontology_infos as $short_name => $ontology_info )
{

	$parent_lookup_sql = 'SELECT DISTINCT parent,lft,depth FROM ' . $short_name . '_hierarchy WHERE name = ? ORDER BY lft,depth';

	$parent_lookup_statement = $database_connection->prepare( $parent_lookup_sql );

	if ( PEAR::isError( $parent_lookup_statement ) )  
	{
		die( "!! - " . $parent_lookup_statement->getMessage() );
	}

	$sql = 'SELECT DISTINCT name,Keywords,FullSentence FROM ' . $data_source . '_' . $short_name . '_hit WHERE ID="' . $_REQUEST[ 'id' ] . '" AND DirectHit=1';

	$result = $database_connection->query( $sql );

	if ( PEAR::isError( $result ) )  
	{
		die( "!! - " . $result->getMessage() );
	}
	
	while ( ( $row = $result->fetchRow() ) )  
	{
		$term_name = $row[ 0 ];
		$keywords = $row[ 1 ];
		$fullsentence = $row[ 2 ];
		
		$parent_info_result = $parent_lookup_statement->execute( array( $term_name ) );

		if ( PEAR::isError( $parent_info_result ) )  
		{
			die( "!! - " . $parent_info_result->getMessage() );
		}

		$cleansentence = str_replace("\n", " ", $fullsentence);
		$cleansentence = str_replace("\t", " ", $cleansentence);		
		
		$hierstr .= $short_name . "\t" . $term_name . "\t" . $keywords . "\t" . $cleansentence;

		while ( ( $parentRow = $parent_info_result->fetchRow() ) )  
		{
			$parent_name = $parentRow[0];
			$depth = $parentRow[2];

			$hierstr .= "\t" . $parent_name . "\t" . $depth;
		}

		$hierstr .= "\n";

		$parent_info_result->free();
	}

	$result->free();
}

$database_connection->disconnect();

echo $hierstr;

?>