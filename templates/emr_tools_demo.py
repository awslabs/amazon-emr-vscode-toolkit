from pyspark.sql import SparkSession

spark = (
        SparkSession.builder.appName("EMRLocal")
        # Uncomment these lines to enable the Glue Data Catalog
        # .config("spark.sql.catalogImplementation", "hive")
        # .config(
        #     "spark.hadoop.hive.metastore.client.factory.class",
        #     "com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory",
        # )
        .getOrCreate()
    )
df = spark.read.csv("s3://noaa-gsod-pds/2022/01001099999.csv", header=True)
print(df.head())