#include <iostream>
#include <sstream>
#include <unistd.h>

#include "database.h"

Database::Database()
{
	connection = 0;
	connected = false;
	pthread_mutex_init(&mutex, 0);
}

Database::~Database()
{
}

void* Database::Routine(void* db)
{
	reinterpret_cast<Database*>(db)->Run();
	return 0;
} 

void Database::Run(void)
{
	Connect();
	while(connected)
	{
		int s = 0;
		pthread_mutex_lock(&mutex);
		s = fifo.size();
		pthread_mutex_unlock(&mutex);

		if(!s)
		{
			usleep(100);
		}
		else
		{
			pthread_mutex_t *m = fifo[0].mutex;
			QueryTouristicLocations(fifo[0].options, *fifo[0].places);

			pthread_mutex_lock(&mutex);
			fifo.erase(fifo.begin());
			pthread_mutex_unlock(&mutex);

			pthread_mutex_unlock(m);
		}

	}
}

void Database::AddQuery(const QuerySQL &query)
{
	pthread_mutex_lock(&mutex);
	fifo.push_back(query);
	pthread_mutex_unlock(&mutex);
}

bool Database::Connect(void)
{
	const char *CONNECTION_STRING = "dbname=interlyon user=postgres password=password hostaddr=127.0.0.1 port=5432";
	
	if(connected)
		return true;
	try
	{
		connection = new pqxx::connection(CONNECTION_STRING);
		connected = true;

		std::cout << "Successfully connected to " << connection->dbname() << "!" << std::endl;
	}
	catch(const std::exception &e)
	{
		connected = false;
		std::cerr << e.what() << std::endl;
	}

	return connected;
}

bool Database::QueryTouristicLocations(const QTouristicLocationsOptions &options, std::vector<TouristicPlace> &places)
{
	if(connected)
	{
		bool ret = false;
		std::ostringstream oss;
		std::ostringstream detail;
		bool hasDetail = false;
		
		oss << "SELECT typ, typ_detail, nom, adresse, ouverture, longitude, latitude FROM tourism WHERE ";
		oss << "longitude >= " << options.minLongitude << " AND longitude <= " << options.maxLongitude;
		oss << " AND latitude >= " << options.minLatitude << " AND latitude <= " << options.maxLatitude;

		if(options.filter.patrimony)
		{
			detail << "typ='PATRIMOINE_CULTUREL' OR typ='PATRIMOINE_NATUREL' ";
			hasDetail = true;
		}
		if(options.filter.gastronomy)
		{
			if(hasDetail)
				detail << "OR ";
			detail << "typ='RESTAURATION' OR typ='DEGUSTATION' ";
			hasDetail = true;
		}
		if(options.filter.accomodation)
		{
			if(hasDetail)
				detail << "OR ";
			detail << "typ='HEBERGEMENT_COLLECTIF' OR typ='HEBERGEMENT_LOCATIF' OR typ='HOTELLERIE' ";
			hasDetail = true;
		}
		if(hasDetail)
			oss << " AND (" << detail.str() << ")";

		oss << ";";

		pqxx::nontransaction query(*connection);

		std::cout << oss.str() << std::endl;
		
		try
		{
			pqxx::result r = query.exec(oss.str());

			std::cout << "The query returned " << r.size() << " results" << std::endl;

			places.clear();

			for(pqxx::result::const_iterator it = r.begin(); it != r.end(); ++it)
			{
				TouristicPlace place;
				if(!(*it)["typ"].to(place.type)
				|| !(*it)["typ_detail"].to(place.typeDetail)
				|| !(*it)["nom"].to(place.name)
				|| !(*it)["adresse"].to(place.address)
				|| !(*it)["ouverture"].to(place.workingHours)
				|| !(*it)["longitude"].to(place.location.longitude)
				|| !(*it)["latitude"].to(place.location.latitude))
					std::cerr << "Could not interpret properly data from one row." << std::endl;
				else
					places.push_back(place);
			}

			ret = true;
		}
		catch(const std::exception &e)
		{
			std::cerr << e.what() << std::endl;
		}

		return ret;
	}
	return false;
}

// void DB_TestDatabase(void)
// {
// 	/*
// 	Tourism table:
// 	    min(longitude) = 45.571755
// 		max(longitude) = 45.900444
// 		min(latitude) = 4.64653
// 		max(latitude) = 5.086112
// 	*/
	
// 	if(Database::Connect())
// 	{
// 		QTouristicLocationsOptions options =
// 		{
// 			45.62,
// 			45.83,
// 			4.65,
// 			4.92,

// 			{true,
// 			false,
// 			false}
// 		};

// 		std::vector<TouristicPlace> places;

// 		Database::QueryTouristicLocations(options, places);
		
// 		std::cout << places.size() << " places were created successfully!" << std::endl;
// 	}
// 	else
// 	{
// 		std::cerr << "Cannot connect to database" << std::endl;
// 	}
// }

int testSQLConnection() {
	try {
		pqxx::connection conn("dbname=interlyon user=postgres password=password hostaddr=127.0.0.1 port=5432");
		if (conn.is_open()) {
			std::cout << "We are connected to " << conn.dbname() << std::endl;

			/* Create a transactional object. */
			pqxx::work w(conn);
			pqxx::result r = w.exec("SELECT nom FROM tourism WHERE typ = 'PATRIMOINE_CULTUREL' AND typ_detail LIKE '%Musée%'");
			w.commit();
			
			for (unsigned int rownum=0; rownum < r.size(); ++rownum)
 			{
				const pqxx::result::tuple row = r[rownum];

				for (unsigned int colnum=0; colnum < row.size(); ++colnum)
				{
					const pqxx::result::field field = row[colnum];

					std::cout << field.c_str() << '\t';
				}

				std::cout << std::endl;
			}
			
			conn.disconnect ();
		}
		else {
			std::cout << "We are not connected!" << std::endl;
		}
	}
	catch (const std::exception &e)
	{
		std::cerr << e.what() << std::endl;
		return 1;
	}
	return 0;
}

