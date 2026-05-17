export class CreatePackageCommand {
  constructor(
    public readonly userId: string,
    public readonly companyId: string,
    public readonly from: string,
    public readonly to: string,
    public readonly fromStation: string,
    public readonly toStation: string,
    public readonly senderName: string,
    public readonly senderPhone: string,
    public readonly recipientName: string,
    public readonly recipientPhone: string,
    public readonly description: string,
    public readonly weight: string,
  ) {}
}
