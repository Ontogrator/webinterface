USE ontogratorct;

-- Utility tables

CREATE TABLE `TextMinerSearches` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `ProcessType` varchar(45) NOT NULL,
  `SearchString` varchar(2000) NOT NULL,
  `StartAt` int NOT NULL DEFAULT 0,
  `EndAt` int DEFAULT NULL,
  `Active` bit(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`ID`)
) ENGINE=MyISAM AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

CREATE TABLE `OntologySubsetQueue` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `Pane` int NOT NULL,
  `OntologyID` varchar(500) NOT NULL,
  `Processed` bit(1) DEFAULT 0,
  PRIMARY KEY (`ID`),
  KEY `Processed_I1` (`Processed`)
) ENGINE=MyISAM AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

-- Create ontology tables

CREATE TABLE `OntologyEntries` (
  `Pane` int NOT NULL,
  `ID` varchar(500) NOT NULL,
  `AltID` varchar(500) NOT NULL,
  `Label` varchar(255) DEFAULT NULL,
  `Definition` varchar(1000) DEFAULT NULL,
  `ParentCount` int NOT NULL,
  `ChildCount` int NOT NULL,
  PRIMARY KEY (`Pane`, `ID`),
  KEY `Label_I1` (`Pane`, `Label`),
  KEY `AltID_I2` (`Pane`, `AltID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE `OntologyRelations` (
  `Pane` int NOT NULL,
  `ID` varchar(500) NOT NULL,
  `Lft` int NOT NULL,
  `Rght` int NOT NULL,
  `Depth` int NOT NULL,
  KEY `ID_I1` (`Pane`, `ID`, `Lft`, `Rght`, `Depth`),
  KEY `LR_I2` (`Pane`, `Lft`, `Rght`, `Depth`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE `OntologySynonyms` (
  `Pane` int NOT NULL,
  `ID` varchar(500) NOT NULL,
  `Synonym` varchar(255) NOT NULL,
  KEY `ID_I1` (`Pane`, `ID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE `OntologyEntriesSubset` (
  `Pane` int NOT NULL,
  `ID` varchar(500) NOT NULL,
  `AltID` varchar(500) NOT NULL,
  `Label` varchar(255) DEFAULT NULL,
  `Definition` varchar(1000) DEFAULT NULL,
  `ParentCount` int NOT NULL,
  `ChildCount` int NOT NULL,
  PRIMARY KEY (`Pane`, `ID`),
  KEY `Label_I1` (`Pane`, `Label`),
  KEY `AltID_I2` (`Pane`, `AltID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Hit and entry tables

CREATE TABLE `Hits` (
  `Tab` int NOT NULL,
  `Pane` int NOT NULL,
  `ID` varchar(128) DEFAULT NULL,
  `Name` varchar(255) DEFAULT NULL,
  `OntologyID` varchar(500) DEFAULT NULL,
  `Keywords` varchar(500) DEFAULT NULL,
  `FullSentence` TEXT DEFAULT NULL,
  `DirectHit` bit DEFAULT 0,
  KEY `HITS_I1` (`Tab`, `Pane`, `ID`,`Name`),
  KEY `HITS_I2` (`Tab`, `Pane`, `Name`,`ID`),
  KEY `HITS_I3` (`OntologyID`),
  KEY `HITS_I4` (`Tab`, `Pane`, `ID`, `OntologyID`),
  KEY `HITS_I5` (`Pane`, `ID`, `Name`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE TABLE `DocumentEntries` (
  `Tab` int NOT NULL,
  `id` varchar(128) DEFAULT NULL,
  `url` text,
  `Links` text,
  `Title` varchar(1000) DEFAULT NULL,
  `Authors` varchar(1000) DEFAULT NULL,
  KEY `DOC_I1` (`Tab`,`ID`),
  KEY `DOC_I2` (`ID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- Views

CREATE VIEW OntologyParent AS
SELECT  oent1.Pane,
        oent1.Label AS `name`,
        'is_a' AS `relation`,
        oent2.Label AS `parent`
FROM    OntologyEntriesSubset oent1
JOIN    OntologyRelations orel1 ON orel1.Pane = oent1.Pane AND orel1.ID = oent1.ID
JOIN    OntologyRelations orel2 ON orel2.Pane = orel1.Pane AND orel2.Lft < orel1.Lft AND orel2.Rght > orel1.Lft
JOIN    OntologyEntriesSubset oent2 ON oent2.Pane = orel2.Pane AND oent2.ID = orel2.ID
WHERE   orel2.Depth = (orel1.Depth - 1);

CREATE VIEW OntologyTerm AS
SELECT  oent1.Pane,
        oent1.Label AS `name`,
        oent1.ParentCount AS `parent_count`,
        oent1.ChildCount AS `child_count`,
        oent1.Definition AS `definition`
FROM    OntologyEntriesSubset oent1;

CREATE VIEW OntologyTermSynonyms AS
SELECT  oent1.Pane,
        oent1.Label AS `name`,
        osyn.Synonym
FROM    OntologyEntriesSubset oent1
JOIN    OntologySynonyms osyn ON osyn.ID = oent1.ID;

CREATE VIEW OntologyHierarchy AS
SELECT  oent1.Pane,
        oent1.Label AS `name`,
        oent2.Label AS `parent`,
        oent2.ChildCount AS `child_count`,
		orel2.Lft AS `lft`,
        orel2.Depth AS `depth`
FROM    OntologyEntriesSubset oent1
JOIN    OntologyRelations orel1 ON orel1.Pane = oent1.Pane AND orel1.ID = oent1.ID
JOIN    OntologyRelations orel2 ON orel2.Pane = orel1.Pane AND orel1.Lft BETWEEN orel2.Lft AND orel2.Rght
JOIN    OntologyEntriesSubset oent2 ON oent2.Pane = orel2.Pane AND oent2.ID = orel2.ID;

CREATE VIEW PANE01_synonyms AS
SELECT `name`, Synonym AS `synonym`
FROM OntologyTermSynonyms
WHERE Pane = 1;

CREATE VIEW PANE02_synonyms AS
SELECT `name`, Synonym AS `synonym`
FROM OntologyTermSynonyms
WHERE Pane = 2;

CREATE VIEW PANE03_synonyms AS
SELECT `name`, Synonym AS `synonym`
FROM OntologyTermSynonyms
WHERE Pane = 3;

CREATE VIEW PANE04_synonyms AS
SELECT `name`, Synonym AS `synonym`
FROM OntologyTermSynonyms
WHERE Pane = 4;

CREATE VIEW PANE01_parent AS
SELECT `name`, `relation`, `parent`
FROM OntologyParent
WHERE Pane = 1;

CREATE VIEW PANE02_parent AS
SELECT `name`, `relation`, `parent`
FROM OntologyParent
WHERE Pane = 2;

CREATE VIEW PANE03_parent AS
SELECT `name`, `relation`, `parent`
FROM OntologyParent
WHERE Pane = 3;

CREATE VIEW PANE04_parent AS
SELECT `name`, `relation`, `parent`
FROM OntologyParent
WHERE Pane = 4;

CREATE VIEW PANE01_term AS
SELECT `name`, `parent_count`, `child_count`, `definition`
FROM OntologyTerm
WHERE Pane = 1;

CREATE VIEW PANE02_term AS
SELECT `name`, `parent_count`, `child_count`, `definition`
FROM OntologyTerm
WHERE Pane = 2;

CREATE VIEW PANE03_term AS
SELECT `name`, `parent_count`, `child_count`, `definition`
FROM OntologyTerm
WHERE Pane = 3;

CREATE VIEW PANE04_term AS
SELECT `name`, `parent_count`, `child_count`, `definition`
FROM OntologyTerm
WHERE Pane = 4;

CREATE VIEW PANE01_hierarchy AS
SELECT `name`, `parent`, `child_count`, `lft`, `depth`
FROM OntologyHierarchy
WHERE Pane = 1;

CREATE VIEW PANE02_hierarchy AS
SELECT `name`, `parent`, `child_count`, `lft`, `depth`
FROM OntologyHierarchy
WHERE Pane = 2;

CREATE VIEW PANE03_hierarchy AS
SELECT `name`, `parent`, `child_count`, `lft`, `depth`
FROM OntologyHierarchy
WHERE Pane = 3;

CREATE VIEW PANE04_hierarchy AS
SELECT `name`, `parent`, `child_count`, `lft`, `depth`
FROM OntologyHierarchy
WHERE Pane = 4;

CREATE VIEW `ALLTAB_PANE01_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Pane = 1;

CREATE VIEW `ALLTAB_PANE02_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Pane = 2;

CREATE VIEW `ALLTAB_PANE03_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Pane = 3;

CREATE VIEW `ALLTAB_PANE04_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Pane = 4;

CREATE VIEW `TAB01_PANE01_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 1 AND Pane = 1;

CREATE VIEW `TAB01_PANE02_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 1 AND Pane = 2;

CREATE VIEW `TAB01_PANE03_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 1 AND Pane = 3;

CREATE VIEW `TAB01_PANE04_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 1 AND Pane = 4;

CREATE VIEW `TAB02_PANE01_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 2 AND Pane = 1;

CREATE VIEW `TAB02_PANE02_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 2 AND Pane = 2;

CREATE VIEW `TAB02_PANE03_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 2 AND Pane = 3;

CREATE VIEW `TAB02_PANE04_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 2 AND Pane = 4;

CREATE VIEW `TAB03_PANE01_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 3 AND Pane = 1;

CREATE VIEW `TAB03_PANE02_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 3 AND Pane = 2;

CREATE VIEW `TAB03_PANE03_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 3 AND Pane = 3;

CREATE VIEW `TAB03_PANE04_hit` AS
SELECT  `ID` AS `id`,
        `Name` AS `name`,
		Keywords,
		FullSentence,
		DirectHit
FROM    Hits
WHERE   Tab = 3 AND Pane = 4;

CREATE VIEW `TAB01_entry` AS
SELECT  *
FROM    DocumentEntries
WHERE	Tab = 1;

CREATE VIEW `TAB02_entry` AS
SELECT  *
FROM    DocumentEntries
WHERE	Tab = 2;

CREATE VIEW `TAB03_entry` AS
SELECT  *
FROM    DocumentEntries
WHERE	Tab = 3;

CREATE VIEW `ALLTAB_entry` AS
SELECT  *
FROM    DocumentEntries;

DELIMITER $$

CREATE PROCEDURE `ontogratorct`.`GetSearch` (processTypeName VARCHAR(500))
BEGIN

    CREATE TEMPORARY TABLE t1 LIKE TextMinerSearches;
    
    START TRANSACTION;
    
    INSERT INTO t1
        SELECT * FROM TextMinerSearches tms WHERE tms.`ProcessType` = processTypeName AND tms.Active = 1 LIMIT 0,1 FOR UPDATE;
        
    UPDATE TextMinerSearches SET Active = 0 WHERE ID IN (SELECT ID FROM t1);
    
    COMMIT;
    
    SELECT * FROM t1;

    DROP TABLE t1;
    
END$$

CREATE PROCEDURE `ontogratorct`.`InsertHit` (tabid INT, paneid INT, documentID VARCHAR(500), ontologyID VARCHAR(500), documentUrl TEXT, documentLinks TEXT, matchedKeywords VARCHAR(500), fullMatchedSentence TEXT, documentTitle VARCHAR(1000), documentAuthors VARCHAR(1000) )
BEGIN
    START TRANSACTION;

    IF NOT EXISTS(SELECT 1 FROM DocumentEntries WHERE `Tab` = tabid AND `id` = documentID AND `url` = documentUrl) THEN
        INSERT INTO DocumentEntries VALUES (tabid, documentID, documentUrl, documentLinks, documentTitle, documentAuthors);
    END IF;
    
    INSERT INTO Hits 
        SELECT DISTINCT tabid, paneid, documentID, oent2.Label, oent2.ID, matchedKeywords, fullMatchedSentence, CASE WHEN oent1.AltID = oent2.AltID THEN 1 ELSE 0 END
        FROM OntologyEntries oent1
        JOIN OntologyRelations orel1 ON orel1.Pane = oent1.Pane AND orel1.ID = oent1.ID
        JOIN OntologyRelations orel2 ON orel2.Pane = oent1.Pane AND orel1.Lft BETWEEN orel2.Lft AND orel2.Rght
        JOIN OntologyEntries oent2 ON oent2.Pane = orel2.Pane AND oent2.ID = orel2.ID
        LEFT JOIN Hits h ON h.Tab = tabid AND h.Pane = oent1.Pane AND h.ID = documentID AND h.OntologyID = oent2.ID
        WHERE oent1.Pane = paneid and oent1.AltID = ontologyID AND h.ID IS NULL;
                
    IF NOT EXISTS(SELECT 1 FROM OntologyEntriesSubset oes WHERE oes.Pane = paneid AND oes.AltID = ontologyID) THEN
        INSERT INTO OntologySubsetQueue (`Pane`, `OntologyID`)
            SELECT paneid, oent.ID FROM OntologyEntries oent WHERE oent.Pane = paneid AND oent.AltID = ontologyID;
    END IF;
    
    COMMIT;
    
END$$

CREATE PROCEDURE `ontogratorct`.`UpdateOntologySubset` ()
BEGIN

    START TRANSACTION;
    
    CREATE TEMPORARY TABLE IF NOT EXISTS t1 (
      `QID` int(11) NOT NULL,
      `Pane` int NOT NULL,
      `ID` VARCHAR(500) NOT NULL,
      `ChildCount` int NOT NULL,
      `Lft` int NOT NULL,
      `Rght` int NOT NULL
    );
    
    DELETE FROM t1;
    
    INSERT INTO t1
        SELECT q.ID, q.Pane, orel2.ID, oent2.ChildCount, orel2.Lft, orel2.Rght
        FROM OntologySubsetQueue q
        JOIN OntologyEntries oent1 ON oent1.Pane = q.Pane AND oent1.ID = q.OntologyID
        JOIN OntologyRelations orel1 ON orel1.Pane = oent1.Pane AND orel1.ID = oent1.ID
        JOIN OntologyRelations orel2 ON orel2.Pane = oent1.Pane AND orel1.Lft BETWEEN orel2.Lft AND orel2.Rght
        JOIN OntologyEntries oent2 ON oent2.Pane = orel2.Pane AND oent2.ID = orel2.ID
        LEFT JOIN OntologyEntriesSubset oentss ON oentss.Pane = q.Pane AND oentss.ID = q.ID 
        WHERE q.Processed = 0 AND oentss.ID IS NULL;

    UPDATE OntologyEntriesSubset oent,t1 t SET oent.ChildCount = t.ChildCount
    WHERE oent.Pane = t.Pane AND oent.ID = t.ID;
    
    INSERT INTO OntologyEntriesSubset
        SELECT DISTINCT oent.* 
        FROM t1 t
        JOIN OntologyEntries oent ON oent.Pane = t.Pane AND oent.ID = t.ID
        LEFT JOIN OntologyEntriesSubset oentss ON oentss.Pane = oent.Pane AND oentss.ID = oent.ID
        WHERE oentss.ID IS NULL;

	UPDATE OntologyEntriesSubset SET ChildCount = 0
    WHERE ID IN 
        (
            SELECT DISTINCT q.OntologyID
            FROM OntologySubsetQueue q
            JOIN t1 t ON t.QID = q.ID
        );
    
    UPDATE OntologySubsetQueue SET Processed = 1
    WHERE ID IN (SELECT QID FROM t1);
    
    DROP TABLE t1;
    
    COMMIT;

END$$

DELIMITER ;

-- Some example searches
-- INSERT INTO TextMinerSearches VALUES
-- (1, 'PubMed', 'db=PubMed&term=(breast+cancer)+AND+(Clinical+Trial[pt]+OR+Clinical+Trial,+Phase+I[pt]+OR+Clinical+Trial,+Phase+II[pt]+OR+Clinical+Trial,+Phase+III[pt]+OR+Clinical+Trial,+Phase+IV[pt])', 0, NULL, 0),
-- (2, 'Pubget', 'q=', 0, NULL, 0),
-- (3, 'ClinicalTrialsGov', 'term=breast+cancer&recr=Closed&phase=1&phase=2&displayxml=true', 0, NULL, 0);