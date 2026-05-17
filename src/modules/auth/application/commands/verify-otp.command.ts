export class VerifyOtpCommand {
  constructor(
    public readonly phone: string | undefined,
    public readonly otp: string,
    public readonly email: string | undefined,
  ) {}
}
