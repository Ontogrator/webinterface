<?php

function get_ontology_terms()
{
  global $ontology_infos;

  $ontology_terms = array();

  // we expect params of the form:
  //
  //  GAZ.0=foo
  //  GAZ.1=bar
  //  ...

  foreach( $ontology_infos as $ontology_short_name => $ontology_info )
    {
      $hasMore = true;
      $counter = 0;

      $result = array();

      while( $hasMore )
	{
	  $key = $ontology_short_name . '_' . $counter;

	  if( isset( $_REQUEST[ $key ] ) )
	    {
	      $result[] = $_REQUEST[ $key ];

	      //echo '<P>' . $ontology_short_name . ' : ' . $_REQUEST[ $key ] . '</P>';

	      $counter++;
	    }
	  else
	    {
	      //echo '<P>' . $key . ' : NO!</P>';

	      $hasMore = false;
	    }
	}

      if( count( $result ) > 0 )
	{
	  $ontology_terms[ $ontology_short_name ] = $result;
	}
    }
      
  return $ontology_terms;
}

function make_OR_sequence( $database_connection, $field_name, $possible_values )
{
  if( count( $possible_values ) == 1 )
    {
      return $field_name . '=' . $database_connection->quote( $possible_values[ 0 ], 'text' );
    }
  else
    {
      $result = '';

      $conjunction = '(';

      foreach( $possible_values as $possible_value )
	{
	  $result .= $conjunction;
	  $result .= $field_name . '=' . $database_connection->quote( $possible_value, 'text' );
	  $conjunction = ' OR ';
	}
      
      $result .= ')';

      return $result;
    }
}


?>