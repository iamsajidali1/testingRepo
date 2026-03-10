from rest_framework import serializers

class TimeSeriesSerializer(serializers.Serializer):
    # TODO: Add validation for ISO 8601 format
    startTime = serializers.CharField()
    endTime = serializers.CharField()

class NetworkInsightsSerializer(serializers.Serializer):
    orchestrator = serializers.CharField()
    tenantId = serializers.CharField()
    tags = serializers.CharField()  # Tags are a comma-separated string
    linkStats = serializers.ListField()  # Stats data for links
    edgeStats = serializers.ListField()  # Stats data for edges
    timeSeries = TimeSeriesSerializer()  # Time series data