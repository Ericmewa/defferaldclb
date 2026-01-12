namespace MyApi.DTOs;

public record SendToRmDto(string AssignedRmId);
public record RmUploadDto(string RmComment, List<NewDocumentDto>? Documents = null);
public record NewDocumentDto(string Name, string Category, string FileUrl);
public record ReturnToCoCreatorDto(string Comment);
public record ConfirmByCoCreatorDto(string Comment);
public record ReportQueryDto(DateTime StartDate, DateTime EndDate);
