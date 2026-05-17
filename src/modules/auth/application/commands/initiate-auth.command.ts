export class InitiateAuthCommand {
  constructor(
    public readonly phone: string | undefined,
    public readonly name: string | undefined,
    public readonly email: string | undefined,
    public readonly cnib: string | undefined,
  ) {}
}
