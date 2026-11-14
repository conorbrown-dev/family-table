FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props ./
COPY backend/src/ backend/src/
RUN dotnet publish backend/src/FamilyTable.Api/FamilyTable.Api.csproj -c Release -o /app
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_HTTP_PORTS=8080
ENTRYPOINT ["sh", "-c", "dotnet FamilyTable.Api.dll --initialize && exec dotnet FamilyTable.Api.dll"]
