from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("EMR Local").getOrCreate()
df = spark.read.csv("s3://noaa-gsod-pds/2022/01001099999.csv", header=True)
print(df.head())