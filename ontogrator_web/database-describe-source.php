<?php

// All code is copyright the Natural Environment Research Council and University of Manchester
// Released under GPLv3 - see LICENCE file for details.


/*
  interface:

  
  database-describe-source.php?name=[x]

     -> returns the column information for the source [x]

  in each case, the result is one column per line; "name" "\t" "width"

 */

include_once( 'config.php' );

if( isset( $_REQUEST[ 'name' ] ) == false )
  {
    die( '!! - no data source named' );
  }

$data_source_name = $_REQUEST[ 'name' ];

foreach( $data_source_infos as $name => $info )
{
	if( $data_source_name == $name )
	{
		foreach( $info[ "columns" ] as $column => $colInfo )
		{
			foreach( $colInfo as $colHeading => $colWidth )
			{
				echo $column . "\t" . $colHeading . "\t" . $colWidth . "\n";
			}
		}

		exit;
	}

}

die( '!! - unrecognised data source' );

?>
